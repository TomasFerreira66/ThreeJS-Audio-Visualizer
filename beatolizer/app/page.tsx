"use client";
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function Home() {
  const mountRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Slider controls
  const [rotationSpeed, setRotationSpeed] = useState(0.005);
  const [displacementAmount, setDisplacementAmount] = useState(0.5);
  const [noiseIntensity, setNoiseIntensity] = useState(0.2);
  const [sphereRadius, setSphereRadius] = useState(2);
  const [colorSensitivity, setColorSensitivity] = useState(1);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();

    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Create a high-detail sphere for vertex manipulation
    let geometry = new THREE.SphereGeometry(sphereRadius, 64, 64);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      wireframe: true
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(0, 0, 0);
    scene.add(sphere);

    // Store original vertex positions
    let originalPositions = new Float32Array(geometry.attributes.position.array);
    
    camera.position.z = 8;

    // Audio setup
    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let dataArray: Uint8Array | null = null;

    const setupFileAudio = (audioElement: HTMLAudioElement) => {
      if (!audioContext) {
        audioContext = new AudioContext();
      }
      
      analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(audioElement);
      
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      analyser.fftSize = 512;
      dataArray = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
    };

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);

      // Rotation with adjustable speed
      sphere.rotation.y += rotationSpeed;

      if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);

        const positions = geometry.attributes.position.array;
        const vertexCount = positions.length / 3;

        // Apply random vertex displacement based on frequency data
        for (let i = 0; i < vertexCount; i++) {
          const i3 = i * 3;
          
          // Get original position
          const originalX = originalPositions[i3];
          const originalY = originalPositions[i3 + 1];
          const originalZ = originalPositions[i3 + 2];
          
          // Use vertex index to map to frequency data for consistent randomness
          const frequencyIndex = Math.floor((i / vertexCount) * dataArray.length);
          const frequency = dataArray[frequencyIndex] || 0;
          
          // Add some noise for more random effect
          const noise = Math.sin(Date.now() * 0.001 + i * 0.1) * 0.5 + 0.5;
          
          // Calculate displacement - combine frequency and noise with adjustable amounts
          const displacement = ((frequency / 255) * (1 - noiseIntensity) + noise * noiseIntensity) * displacementAmount;
          
          // Calculate normal vector for this vertex
          const length = Math.sqrt(originalX * originalX + originalY * originalY + originalZ * originalZ);
          const normalX = originalX / length;
          const normalY = originalY / length;
          const normalZ = originalZ / length;
          
          // Apply displacement along the normal
          positions[i3] = originalX + normalX * displacement;
          positions[i3 + 1] = originalY + normalY * displacement;
          positions[i3 + 2] = originalZ + normalZ * displacement;
        }
        
        // Update geometry
        geometry.attributes.position.needsUpdate = true;

        // Change color based on overall audio intensity with adjustable sensitivity
        const average = Array.from(dataArray).reduce((sum, value) => sum + value, 0) / dataArray.length;
        const hue = (average / 255) * 360 * colorSensitivity;
        sphere.material.color.setHSL((hue % 360) / 360, 1, 0.5);
      }

      renderer.render(scene, camera);
    };

    animate();

    // Event handlers for file input
    const handleFileChange = (event: Event) => {
      const target = event.target as HTMLInputElement;
      const file = target.files?.[0];
      if (file && audioRef.current) {
        const url = URL.createObjectURL(file);
        audioRef.current.src = url;
        setupFileAudio(audioRef.current);
      }
    };

    if (fileInputRef.current) {
      fileInputRef.current.addEventListener('change', handleFileChange);
    }

    // Cleanup
    return () => {
      if (mountRef.current && renderer.domElement.parentNode) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (audioContext) {
        audioContext.close();
      }
      if (fileInputRef.current) {
        fileInputRef.current.removeEventListener('change', handleFileChange);
      }
    };
  }, [rotationSpeed, displacementAmount, noiseIntensity, sphereRadius, colorSensitivity]);

  return (
    <div className="w-full h-screen bg-black">
      <div ref={mountRef} className="w-full h-full" />
      
      {/* Audio Controls */}
      <div className="absolute top-4 left-4 text-white space-y-4 bg-black bg-opacity-50 p-4 rounded">
        <div className="space-y-2">
          <label className="block mb-2">Upload Audio File:</label>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="block w-full text-sm text-gray-300
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-600 file:text-white
              hover:file:bg-blue-700"
          />
          
          <audio
            ref={audioRef}
            controls
            className="w-full"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
        </div>

        {/* Control Sliders */}
        <div className="space-y-3 pt-4 border-t border-gray-600">
          <div>
            <label className="block text-xs mb-1">Rotation Speed: {rotationSpeed.toFixed(3)}</label>
            <input
              type="range"
              min="0"
              max="0.02"
              step="0.001"
              value={rotationSpeed}
              onChange={(e) => setRotationSpeed(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Displacement Amount: {displacementAmount.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={displacementAmount}
              onChange={(e) => setDisplacementAmount(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Noise Intensity: {noiseIntensity.toFixed(2)}</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={noiseIntensity}
              onChange={(e) => setNoiseIntensity(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>

          <div>
            <label className="block text-xs mb-1">Color Sensitivity: {colorSensitivity.toFixed(1)}</label>
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.1"
              value={colorSensitivity}
              onChange={(e) => setColorSensitivity(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}