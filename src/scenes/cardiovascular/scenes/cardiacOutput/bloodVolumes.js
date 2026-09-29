import * as THREE from 'three';
import { cavitySurfacePoint } from '../heartFailure/geometry/ventricleGeometry.js';

/**
 * The two amounts of blood a reader has to see, drawn so they can be seen.
 *
 * A beat splits what is in the ventricle into two parts: the blood that
 * leaves (the stroke volume) and the blood that stays (the end-systolic
 * volume). Lowering contractility moves the split — less leaves, more stays —
 * and the chamber's own motion shows that only as a cavity a few percent
 * wider at the end of the beat: a volume 1.5 times larger is a radius 1.15
 * times larger (owner's review, 2026-09-27: 「3D表現として明らかに違って見える」).
 *
 * So two drawings, both of solved volumes and nothing else:
 *
 * - **`ResidualBlood`** — the blood that stays, inside the heart: the cavity
 *   at the end of the beat (this condition's ESV), as a solid dark-red body
 *   the wall closes onto. Where it is and how big it is are the model's; it
 *   uses the same analytic cavity surface the chamber does.
 * - **`VolumeGauge`** — the same two volumes on a **linear** scale beside the
 *   heart, where 49 → 75 mL reads as a column half as tall again. One column
 *   for now and, once anything has moved, one for the start, at the same
 *   moment of the beat. Heights are millilitres times one constant; nothing is
 *   exaggerated and nothing is scaled per condition.
 */

/** World units per millilitre in the gauge. The largest EDV the controls reach (~172 mL) fits in 4.7. */
export const GAUGE_UNITS_PER_ML = 0.026;
/** The glass is drawn to this volume, so a full column never pokes out of it. */
export const GAUGE_CAPACITY_ML = 180;

const RESIDUAL_RINGS = 18;
const RESIDUAL_SEGMENTS = 28;
/** Just inside the wall, so the two surfaces do not fight at end-systole. */
const RESIDUAL_INSET = 0.965;
/** Up to just under the valve plane: above it there is no cavity. */
const RESIDUAL_TOP = 0.93;

/**
 * The blood that stays in the ventricle after it has contracted, drawn as
 * the end-systolic cavity.
 */
export class ResidualBlood extends THREE.Mesh {
  /** @param {{ color: THREE.ColorRepresentation }} options */
  constructor({ color }) {
    const rings = RESIDUAL_RINGS;
    const segments = RESIDUAL_SEGMENTS;
    // One grid (apex → top) plus a centre vertex that closes the top.
    const positions = new Float32Array(((rings + 1) * (segments + 1) + 1) * 3);
    const index = [];
    const at = (i, j) => i * (segments + 1) + j;
    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segments; j++) {
        index.push(at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j), at(i + 1, j + 1), at(i, j + 1));
      }
    }
    const centre = (rings + 1) * (segments + 1);
    for (let j = 0; j < segments; j++) index.push(at(rings, j), centre, at(rings, j + 1));
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setIndex(index);
    super(
      geometry,
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color),
        emissiveIntensity: 0.25,
        roughness: 0.28,
        metalness: 0,
        transparent: true,
        opacity: 0.85,
        // Not written to depth, so the start's cage drawn inside it (when
        // "before" is on and less stayed then) is not hidden by it.
        depthWrite: false,
        side: THREE.FrontSide,
      })
    );
    this.name = 'residual-blood';
    this.renderOrder = 1;
    this._point = new THREE.Vector3();
    this._baseEmissive = 0.25;
  }

  /**
   * @param {{ cavityRadius: number, cavitySemiLength: number,
   *   outerSemiLength: number, baseY: number }} shape the end-systolic ventricle
   */
  setShape(shape) {
    const positions = this.geometry.attributes.position.array;
    const segments = RESIDUAL_SEGMENTS;
    let p = 0;
    let topY = 0;
    const axis = new THREE.Vector3();
    for (let i = 0; i <= RESIDUAL_RINGS; i++) {
      const t = (i / RESIDUAL_RINGS) * RESIDUAL_TOP;
      axis.set(0, 0, 0);
      const ring = [];
      for (let j = 0; j <= segments; j++) {
        const phi = (j / segments) * Math.PI * 2;
        cavitySurfacePoint(shape, t, phi, this._point);
        ring.push(this._point.clone());
        if (j < segments) axis.add(this._point);
      }
      axis.multiplyScalar(1 / segments);
      for (const point of ring) {
        // Pulled in towards the ring's own centre, not the origin, so the
        // inset follows the cavity's bow and drift.
        positions[p++] = axis.x + (point.x - axis.x) * RESIDUAL_INSET;
        positions[p++] = point.y;
        positions[p++] = axis.z + (point.z - axis.z) * RESIDUAL_INSET;
      }
      if (i === RESIDUAL_RINGS) {
        topY = axis.y;
        positions[p++] = axis.x;
        positions[p++] = topY;
        positions[p++] = axis.z;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.computeVertexNormals();
    // Both bounds: the sphere for culling, the box for anything that
    // measures it — a stale box kept the first condition's size.
    this.geometry.computeBoundingSphere();
    this.geometry.computeBoundingBox();
    this.topY = topY;
  }

  /** Presentation: how strongly it is being pointed at, 0..1. */
  setHighlight(amount) {
    this.material.emissiveIntensity = this._baseEmissive + amount * 0.9;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
  }
}

/**
 * One column: glass to the capacity, the blood that stays at the bottom, the
 * blood that will leave on top of it, and a mark where the beat was full.
 */
function buildColumn({ radius, residualColor, ejectColor, glassColor, outlineColor, ghost }) {
  const group = new THREE.Group();
  const height = GAUGE_CAPACITY_ML * GAUGE_UNITS_PER_ML;
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.12, radius * 1.12, height, 32, 1, true),
    new THREE.MeshBasicMaterial({ color: glassColor, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false })
  );
  glass.position.y = height / 2;
  const unit = new THREE.CylinderGeometry(radius, radius, 1, 32, 1, false);
  unit.translate(0, 0.5, 0);
  const fillMaterial = (color) =>
    ghost
      ? new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22, depthWrite: false })
      : new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.3, roughness: 0.5, transparent: true, opacity: 0.95 });
  const residual = new THREE.Mesh(unit, fillMaterial(new THREE.Color(residualColor)));
  const eject = new THREE.Mesh(unit.clone(), fillMaterial(new THREE.Color(ejectColor)));
  // Where the beat was fullest (EDV): a ring, so the part that has already
  // left this beat is still measurable as the gap under it.
  const full = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.16, 0.035, 8, 40),
    new THREE.MeshBasicMaterial({ color: ghost ? outlineColor : glassColor, transparent: true, opacity: ghost ? 0.7 : 0.9 })
  );
  full.rotation.x = Math.PI / 2;
  // A ghost is outlined: edges of the fills, so it is read as "the start",
  // never as a second heart's worth of blood.
  let outline = null;
  if (ghost) {
    outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.CylinderGeometry(radius, radius, 1, 16, 1, false)),
      new THREE.LineBasicMaterial({ color: outlineColor, transparent: true, opacity: 0.9 })
    );
  }
  group.add(glass, residual, eject, full);
  if (outline) group.add(outline);
  return { group, residual, eject, full, outline };
}

/**
 * Two columns of blood on one linear scale: the start (left, outlined) and
 * now (right, solid). Each shows, at the moment of the beat on screen, how
 * much is in the ventricle, split into what stays (ESV) and what is still to
 * leave (volume now − ESV), with a ring at the fullest point (EDV).
 */
export class VolumeGauge extends THREE.Group {
  /**
   * @param {{ residualColor: THREE.ColorRepresentation, ejectColor: THREE.ColorRepresentation,
   *   outlineColor: THREE.ColorRepresentation, glassColor?: THREE.ColorRepresentation,
   *   radius?: number, spacing?: number }} options
   */
  constructor({ residualColor, ejectColor, outlineColor, glassColor = '#dfe8f5', radius = 0.4, spacing = 1.2 }) {
    super();
    this.name = 'volume-gauge';
    this.now = buildColumn({ radius, residualColor, ejectColor, glassColor, outlineColor, ghost: false });
    this.before = buildColumn({ radius, residualColor, ejectColor, glassColor, outlineColor, ghost: true });
    this.before.group.position.x = -spacing / 2;
    this.now.group.position.x = spacing / 2;
    this.add(this.before.group, this.now.group);
    this.before.group.visible = false;
    this.spacing = spacing;
    this.readings = null;
  }

  /**
   * @param {{ volumeMl: number, esvMl: number, edvMl: number }} now at this moment of the beat
   * @param {null | { volumeMl: number, esvMl: number, edvMl: number }} before the start, at the same moment, or null
   */
  setVolumes(now, before) {
    apply(this.now, now);
    this.before.group.visible = Boolean(before);
    if (before) apply(this.before, before);
    this.readings = {
      now: heights(now),
      before: before ? heights(before) : null,
    };
  }

  /** Presentation: which part is being pointed at. */
  setHighlight({ residual = 0, eject = 0 } = {}) {
    this.now.residual.material.emissiveIntensity = 0.3 + residual * 0.8;
    this.now.eject.material.emissiveIntensity = 0.3 + eject * 0.8;
  }

  /** World positions a label can hang from: the middle of each part of the current column. */
  anchor(part) {
    if (part === 'top') {
      // Above the glass, centred on the pair, clear of the title's own height.
      return this.localToWorld(new THREE.Vector3(0, GAUGE_CAPACITY_ML * GAUGE_UNITS_PER_ML + 0.9, 0));
    }
    if (part === 'before-base' || part === 'now-base') {
      const column = part === 'before-base' ? this.before : this.now;
      return this.localToWorld(new THREE.Vector3(column.group.position.x, -0.35, 0));
    }
    const h = this.readings?.now;
    const local = new THREE.Vector3(this.now.group.position.x, 0, 0);
    if (h) local.y = part === 'residual' ? h.residual / 2 : h.residual + Math.max(h.eject, 0.2) / 2;
    return this.localToWorld(local);
  }

  dispose() {
    this.traverse((node) => {
      node.geometry?.dispose?.();
      node.material?.dispose?.();
    });
  }
}

/** Column heights for a reading, in world units: linear in millilitres. */
export function heights({ volumeMl, esvMl, edvMl }) {
  const residual = Math.max(0, esvMl) * GAUGE_UNITS_PER_ML;
  const eject = Math.max(0, volumeMl - esvMl) * GAUGE_UNITS_PER_ML;
  return { residual, eject, full: Math.max(0, edvMl) * GAUGE_UNITS_PER_ML };
}

function apply(column, reading) {
  const h = heights(reading);
  column.residual.scale.y = Math.max(1e-3, h.residual);
  column.eject.position.y = h.residual;
  column.eject.scale.y = Math.max(1e-3, h.eject);
  column.eject.visible = h.eject > 0.01;
  column.full.position.y = h.full;
  if (column.outline) {
    column.outline.scale.y = Math.max(1e-3, h.residual);
    column.outline.position.y = h.residual / 2;
  }
}
