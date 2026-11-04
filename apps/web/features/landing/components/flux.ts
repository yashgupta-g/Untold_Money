import gsap from "gsap";
import {
  LinearFilter,
  Mesh,
  PerspectiveCamera,
  PlaneGeometry,
  Raycaster,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
  WebGLRenderer,
  type Texture,
} from "three";

/*
 * Reel flux: every card in the reel is redrawn as a WebGL plane that sits
 * exactly on top of its DOM box. The planes turn as they travel across the
 * screen (a reel wrapping round a drum), and scroll speed makes them bend,
 * shear and ripple like liquid. The pointer drops a local ripple on the
 * card beneath it. The DOM images stay in the page as the accessible,
 * no-WebGL version and are hidden only once every texture has loaded.
 */

/** Scroll speed, normalised to -1…1: written by ScrollTrigger, eased here. */
export type Flow = { target: number; value: number };

const VERTEX = /* glsl */ `
  uniform float uTime;
  uniform float uVelocity;
  uniform float uCenterX;
  uniform float uHalfW;
  uniform vec2 uPlane;
  uniform vec2 uHover;
  uniform float uHoverAmt;

  varying vec2 vUv;
  varying float vTurn;
  varying float vRipple;

  void main() {
    vUv = uv;
    vec4 world = modelMatrix * vec4(position, 1.0);
    float lx = (uv.x - 0.5) * 2.0;
    float nx = clamp(uCenterX / uHalfW, -1.4, 1.4);

    // The reel wraps round a drum: each card turns away as it nears an edge.
    float turn = lx * nx;
    world.z -= turn * uPlane.x * 0.16;

    // A gentle concave curve at rest that bulges with speed.
    world.z -= lx * lx * (18.0 + abs(uVelocity) * 150.0);

    // Flux: shear and a travelling ripple while the reel is moving.
    world.y += lx * uVelocity * 30.0;
    float ripple = sin(uv.x * 9.0 + uv.y * 2.0 - uTime * 5.0 + uCenterX * 0.004) * uVelocity * 26.0;
    world.z += ripple;

    // Pointer ripple, spreading out from where the cursor touches the card.
    vec2 d2 = (uv - uHover) * uPlane / max(uPlane.x, uPlane.y);
    float d = length(d2);
    world.z += sin(d * 40.0 - uTime * 7.0) * exp(-d * 5.5) * uHoverAmt * 14.0;

    vTurn = turn;
    vRipple = ripple / 26.0;
    gl_Position = projectionMatrix * viewMatrix * world;
  }
`;

const FRAGMENT = /* glsl */ `
  uniform sampler2D uTexture;
  uniform vec2 uPlane;
  uniform vec2 uImage;
  uniform float uVelocity;
  uniform float uRadius;

  varying vec2 vUv;
  varying float vTurn;
  varying float vRipple;

  // object-fit: cover, in UV space.
  vec2 cover(vec2 uv) {
    vec2 ratio = uPlane / uImage;
    float scale = max(ratio.x, ratio.y);
    vec2 size = uImage * scale;
    return (uv * uPlane + (size - uPlane) * 0.5) / size;
  }

  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    // A little zoom while moving, so the bent edges never show the texture edge.
    vec2 uv = (cover(vUv) - 0.5) * (1.0 - abs(uVelocity) * 0.06) + 0.5;
    float split = uVelocity * 0.009;
    vec4 base = texture2D(uTexture, uv);
    float r = texture2D(uTexture, uv + vec2(split, 0.0)).r;
    float b = texture2D(uTexture, uv - vec2(split, 0.0)).b;
    vec3 color = vec3(r, base.g, b);

    // Light falls off on the side turning away, and catches ripple crests.
    color *= 1.0 - max(vTurn, 0.0) * 0.22;
    color += vRipple * 0.06;

    vec2 p = (vUv - 0.5) * uPlane;
    float edge = roundedBox(p, uPlane * 0.5, uRadius);
    float alpha = 1.0 - smoothstep(-1.0, 0.5, edge);
    gl_FragColor = vec4(color, alpha);
    #include <colorspace_fragment>
  }
`;

export function createFlux({
  canvas,
  stage,
  cards,
  flow,
  radius,
  onReady,
}: {
  canvas: HTMLCanvasElement;
  /** The pinned box the canvas covers. */
  stage: HTMLElement;
  /** DOM image boxes; each carries its image URL in data-src. */
  cards: HTMLElement[];
  flow: Flow;
  radius: number;
  onReady: () => void;
}) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

  // 1 world unit = 1 CSS pixel at z = 0, so planes can copy DOM boxes directly.
  const DEPTH = 1000;
  const scene = new Scene();
  const camera = new PerspectiveCamera(50, 1, 10, 4000);
  camera.position.z = DEPTH;

  const geometry = new PlaneGeometry(1, 1, 48, 24);
  const loader = new TextureLoader();
  const textures: Texture[] = [];
  let loaded = 0;

  const items = cards.map((el) => {
    const material = new ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      uniforms: {
        uTexture: { value: null },
        uTime: { value: 0 },
        uVelocity: { value: 0 },
        uCenterX: { value: 0 },
        uHalfW: { value: 1 },
        uPlane: { value: new Vector2(1, 1) },
        uImage: { value: new Vector2(1, 1) },
        uHover: { value: new Vector2(0.5, 0.5) },
        uHoverAmt: { value: 0 },
        uRadius: { value: radius },
      },
    });
    const mesh = new Mesh(geometry, material);
    mesh.visible = false;
    scene.add(mesh);

    loader.load(el.dataset.src ?? "", (texture) => {
      texture.colorSpace = SRGBColorSpace;
      texture.minFilter = LinearFilter;
      texture.generateMipmaps = false;
      textures.push(texture);
      const image = texture.image as { width: number; height: number };
      material.uniforms.uTexture.value = texture;
      material.uniforms.uImage.value.set(image.width, image.height);
      mesh.visible = true;
      loaded += 1;
      if (loaded === cards.length) onReady();
    });

    return { el, mesh, material, hover: 0 };
  });

  const resize = () => {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = (2 * Math.atan(h / 2 / DEPTH) * 180) / Math.PI;
    camera.updateProjectionMatrix();
  };
  resize();
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);

  // Only draw while the reel is on screen.
  let visible = false;
  const visibility = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting), {
    rootMargin: "120px",
  });
  visibility.observe(stage);

  const pointer = new Vector2(-10, -10);
  const raycaster = new Raycaster();
  const onMove = (e: PointerEvent) => {
    const box = stage.getBoundingClientRect();
    pointer.set(
      ((e.clientX - box.left) / box.width) * 2 - 1,
      -((e.clientY - box.top) / box.height) * 2 + 1,
    );
  };
  const onLeave = () => pointer.set(-10, -10);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerleave", onLeave);

  let time = 0;
  const tick = (_time: number, deltaMs: number) => {
    flow.target *= 0.9;
    flow.value += (flow.target - flow.value) * 0.12;
    if (!visible) return;
    time += deltaMs / 1000;

    const box = stage.getBoundingClientRect();
    for (const item of items) {
      const r = item.el.getBoundingClientRect();
      const x = r.left - box.left + r.width / 2 - box.width / 2;
      const y = -(r.top - box.top + r.height / 2 - box.height / 2);
      item.mesh.position.set(x, y, 0);
      item.mesh.scale.set(r.width, r.height, 1);
      const u = item.material.uniforms;
      u.uPlane.value.set(r.width, r.height);
      u.uCenterX.value = x;
      u.uHalfW.value = box.width / 2;
      u.uTime.value = time;
      u.uVelocity.value = flow.value;
    }

    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(
      items.map((i) => i.mesh),
      false,
    )[0];
    for (const item of items) {
      const on = hit?.object === item.mesh;
      item.hover += ((on ? 1 : 0) - item.hover) * 0.08;
      if (on && hit.uv) item.material.uniforms.uHover.value.copy(hit.uv);
      item.material.uniforms.uHoverAmt.value = item.hover;
    }

    renderer.render(scene, camera);
  };
  gsap.ticker.add(tick);

  return {
    dispose() {
      gsap.ticker.remove(tick);
      resizeObserver.disconnect();
      visibility.disconnect();
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      items.forEach((i) => i.material.dispose());
      textures.forEach((t) => t.dispose());
      geometry.dispose();
      renderer.dispose();
    },
  };
}
