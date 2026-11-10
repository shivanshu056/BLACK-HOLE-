import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js';

const canvas = document.querySelector('#space');
const errorBox = document.querySelector('#error');

try {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0x03040b, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x03040b, 0.006);
  const camera = new THREE.PerspectiveCamera(48, innerWidth / innerHeight, 0.1, 500);
  camera.position.set(0, 7.5, 19);

  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.dampingFactor = 0.045;
  orbit.minDistance = 8;
  orbit.maxDistance = 34;
  orbit.target.set(0, 0, 0);

  scene.add(new THREE.AmbientLight(0x6372a8, 0.45));
  const blueLight = new THREE.PointLight(0x477cff, 85, 35);
  blueLight.position.set(-5, 4, 5); scene.add(blueLight);
  const orangeLight = new THREE.PointLight(0xff713b, 70, 30);
  orangeLight.position.set(5, -2, -4); scene.add(orangeLight);

  // Black event horizon.
  const hole = new THREE.Mesh(
    new THREE.SphereGeometry(2.0, 96, 96),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  scene.add(hole);

  // Photon sphere: a bright, thin ring around the event horizon.
  const photonRing = new THREE.Mesh(
    new THREE.TorusGeometry(2.16, 0.055, 16, 160),
    new THREE.MeshBasicMaterial({ color: 0xffc18a })
  );
  photonRing.rotation.x = Math.PI / 2.15;
  scene.add(photonRing);

  // Layered 3D accretion disk in the XZ plane.
  const disk = new THREE.Group();
  disk.rotation.x = -0.13;
  scene.add(disk);
  const ringSpecs = [
    [2.55, 0.10, 0xff542e, 0.75],
    [2.90, 0.075, 0xff9b45, 0.68],
    [3.35, 0.055, 0xffd18a, 0.55],
    [3.85, 0.045, 0x9a72ff, 0.42],
    [4.35, 0.035, 0x4e9dff, 0.34]
  ];
  for (const [radius, tube, color, opacity] of ringSpecs) {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(radius, tube, 8, 220),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending })
    );
    mesh.rotation.x = Math.PI / 2;
    disk.add(mesh);
  }

  // 4,000 actual 3D particles orbiting on slightly varied inclined paths.
  const count = 4000;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const data = [];
  const palette = [new THREE.Color(0xff653c), new THREE.Color(0xffc477), new THREE.Color(0x9c72ff), new THREE.Color(0x68baff)];
  for (let i = 0; i < count; i++) {
    const radius = 2.55 + Math.random() * 2.25;
    const angle = Math.random() * Math.PI * 2;
    const inclination = (Math.random() - 0.5) * 0.18;
    const color = palette[Math.floor(Math.random() * palette.length)];
    colors.set([color.r, color.g, color.b], i * 3);
    data.push({ radius, angle, inclination, phase: Math.random() * 6.28 });
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const particleMaterial = new THREE.PointsMaterial({
    size: 0.075, vertexColors: true, transparent: true, opacity: 0.92,
    blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  });
  const particleCloud = new THREE.Points(particleGeometry, particleMaterial);
  disk.add(particleCloud);
  document.querySelector('#particleCount').textContent = count.toLocaleString();

  // Star field surrounding the whole scene.
  const starPositions = [];
  for (let i = 0; i < 2600; i++) {
    const r = 45 + Math.random() * 100;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions.push(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({
    color: 0xc8dcff, size: 0.13, transparent: true, opacity: 0.9, sizeAttenuation: true
  })));

  // Subtle volumetric-looking glow shell.
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(2.28, 48, 48),
    new THREE.MeshBasicMaterial({ color: 0x35205e, transparent: true, opacity: 0.12, side: THREE.BackSide })
  );
  scene.add(glow);

  let gravity = 1, rotationSpeed = 1, brightness = 0.75, paused = false;
  const $ = id => document.getElementById(id);
  $('gravity').addEventListener('input', e => {
    gravity = Number(e.target.value); $('gravityValue').textContent = gravity.toFixed(1) + '×';
  });
  $('speed').addEventListener('input', e => {
    rotationSpeed = Number(e.target.value); $('speedValue').textContent = rotationSpeed.toFixed(1) + '×';
  });
  $('brightness').addEventListener('input', e => {
    brightness = Number(e.target.value) / 100; $('brightnessValue').textContent = e.target.value + '%';
    particleMaterial.opacity = Math.min(1, brightness);
    ringSpecs.forEach((_, i) => { disk.children[i].material.opacity = Math.min(0.95, ringSpecs[i][3] * brightness); });
  });
  $('pauseBtn').addEventListener('click', () => {
    paused = !paused; $('pauseBtn').innerHTML = paused ? '▶ &nbsp; RESUME' : 'Ⅱ &nbsp; PAUSE';
  });
  $('resetBtn').addEventListener('click', () => {
    gravity = 1; rotationSpeed = 1; brightness = 0.75; paused = false;
    $('gravity').value = 1; $('speed').value = 1; $('brightness').value = 75;
    $('gravityValue').textContent = '1.0×'; $('speedValue').textContent = '1.0×'; $('brightnessValue').textContent = '75%';
    $('pauseBtn').innerHTML = 'Ⅱ &nbsp; PAUSE';
    camera.position.set(0, 7.5, 19); orbit.target.set(0, 0, 0); orbit.update();
  });

  const clock = new THREE.Clock();
  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.04);
    if (!paused) {
      disk.rotation.y += dt * 0.12 * rotationSpeed;
      const p = particleGeometry.attributes.position.array;
      for (let i = 0; i < count; i++) {
        const d = data[i];
        d.angle += dt * rotationSpeed * gravity * (0.7 + 2.0 / (d.radius * d.radius));
        const a = d.angle, r = d.radius;
        p[i * 3] = Math.cos(a) * r;
        p[i * 3 + 1] = Math.sin(a * 2 + d.phase) * 0.10 + d.inclination * r;
        p[i * 3 + 2] = Math.sin(a) * r;
      }
      particleGeometry.attributes.position.needsUpdate = true;
      photonRing.rotation.z += dt * 0.08 * rotationSpeed;
      glow.rotation.y -= dt * 0.04;
    }
    orbit.update();
    renderer.render(scene, camera);
  }
  animate();

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });
} catch (err) {
  console.error(err);
  errorBox.style.display = 'block';
}
