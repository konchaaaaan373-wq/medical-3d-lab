/**
 * Fetching the MRI atlas: the index, the volumes, the meshes.
 *
 * Nothing here is fetched until the atlas is opened, and not all of it then:
 * the index (67 kB) and the T1 volume and labels come first, because a slice
 * can be drawn from those alone; the meshes follow; T2 is not fetched at all
 * until a reader asks for it. The front page touches none of it.
 *
 * ## The volumes are gzip files, decompressed here
 *
 * A volume is 8.5 MB of bytes that compress to under 3 MB, and a static host
 * does not compress a file type it does not recognise. So the files are
 * committed already gzipped and inflated in the browser with
 * `DecompressionStream`. One trap is handled explicitly: a server that *does*
 * recognise `.gz` may send it with `Content-Encoding: gzip`, in which case the
 * browser has already inflated it and inflating again would fail. The bytes
 * say which happened — a gzip stream starts `1f 8b` — so the decision is made
 * from the bytes, not from a header.
 */
const BASE_URL = import.meta.env?.BASE_URL ?? './';
export const MRI_ASSET_BASE = `${BASE_URL}assets/mri/`;

const isGzip = (bytes) => bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b;

async function inflate(bytes) {
  if (typeof DecompressionStream !== 'function') {
    throw new Error('this browser cannot decompress the MRI volume (no DecompressionStream)');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function fetchBytes(url, signal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function loadAtlasIndex({ signal } = {}) {
  const response = await fetch(`${MRI_ASSET_BASE}atlas.json`, { signal });
  if (!response.ok) throw new Error(`atlas.json: ${response.status}`);
  return response.json();
}

/**
 * @param {{file:string, bytes:number}} volume an entry of `atlas.volumes`
 * @returns {Promise<Uint8Array>}
 */
export async function loadVolume(volume, { signal } = {}) {
  const raw = await fetchBytes(`${MRI_ASSET_BASE}${volume.file}`, signal);
  const bytes = isGzip(raw) ? await inflate(raw) : raw;
  if (bytes.length !== volume.bytes) {
    throw new Error(`${volume.file}: ${bytes.length} bytes after decompression, expected ${volume.bytes}`);
  }
  return bytes;
}

/** The CerebrA surface meshes. `three` and the loader arrive with this call, not with the page. */
export async function loadAtlasMeshes() {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const gltf = await new GLTFLoader().loadAsync(`${MRI_ASSET_BASE}cerebra.glb`);
  return gltf.scene;
}
