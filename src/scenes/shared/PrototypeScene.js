import * as THREE from 'three';
import { clamp } from '../../utils/math.js';
import { disposeObject } from '../../utils/dispose.js';
import { createStudioLights } from './lighting.js';
import { prototypeMeta } from './prototypeMeta.js';

/**
 * The shell every organ prototype is built on.
 *
 * `App` hosts a scene through a small interface — `meta`, `cameraPose`,
 * `build`, `setProgress`, `update`, `getAnnotations`, `dispose` — and the
 * camera, the orbit controls, the environment, the language toggle, the label
 * layer, the stage read-out, play/pause and reset already live above it. What
 * was left for every new organ to repeat was the boilerplate around its own
 * geometry, and that is what this removes.
 *
 * What it deliberately does *not* do is generalise the scenes themselves. The
 * heart-failure scene keeps its own class, its own panels and its own model;
 * pushing it through here would be abstraction for its own sake. This is the
 * floor for a new organ, not a ceiling for a developed one — a scene that
 * outgrows it stops calling it and implements the same interface directly.
 *
 * The model contract, in full:
 *
 *   object                    THREE.Object3D — everything the scene draws
 *   setProgress(value)        0..1, the one state the UI drives
 *   update(dt, elapsed)       per-frame motion
 *   anchors                   { name: Vector3 } — where the labels hang
 *   focus                     optional Object3D the camera should frame on
 *   dispose()                 optional; anything not owned by `object`
 *
 * @param {{ copy: object,
 *           cameraPose: { position: number[], target: number[] },
 *           createModel: () => object,
 *           framing?: { headroom?: number, lift?: number },
 *           lights?: object }} definition
 */
export function definePrototypeScene({ copy, cameraPose, createModel, framing, lights }) {
  return class PrototypeScene {
    static meta = prototypeMeta(copy);

    static cameraPose = {
      position: new THREE.Vector3(...cameraPose.position),
      target: new THREE.Vector3(...cameraPose.target),
    };

    /** @param {{ viewer?: import('../../app/Viewer.js').Viewer }} [context] */
    constructor({ viewer } = {}) {
      this.viewer = viewer;
      this.root = new THREE.Group();
      this.root.name = copy.id;
      this.progress = 0;
    }

    build() {
      this.model = createModel();
      this.root.add(createStudioLights(lights), this.model.object);
      // The authored pose says which side to look from; how far away is worked
      // out from what was actually built, so a scene cannot be authored to
      // crop its own subject and does not have to be re-tuned every time the
      // geometry changes. See `fitPose`.
      // Framed on `focus` when the model names one. Several scenes draw context
      // that is much larger than their subject — a vessel running off to the
      // midline, a duodenal loop, a kidney under an adrenal gland — and framing
      // on the whole group pushes the subject into a corner.
      PrototypeScene.cameraPose = fitPose(this.model.focus ?? this.model.object, PrototypeScene.cameraPose, framing);
      this.setProgress(0);
      return this.root;
    }

    /** @param {number} value 0..1 */
    setProgress(value) {
      this.progress = clamp(value);
      this.model?.setProgress?.(this.progress);
    }

    update(dt, elapsed) {
      this.model?.update?.(dt, elapsed);
    }

    /**
     * Floating labels, anchored to points the model publishes rather than to
     * coordinates typed twice. A label that names a structure the model moved
     * would otherwise drift off it.
     */
    getAnnotations() {
      const anchors = this.model?.anchors ?? {};
      return (copy.annotations ?? []).flatMap((annotation) => {
        const anchor = annotation.anchor ? anchors[annotation.anchor] : annotation.position;
        if (!anchor) {
          console.warn(`${copy.id}: annotation "${annotation.id}" has no anchor "${annotation.anchor}"`);
          return [];
        }
        const position = Array.isArray(anchor) ? new THREE.Vector3(...anchor) : anchor.clone();
        return [{ ...annotation, position }];
      });
    }

    dispose() {
      this.model?.dispose?.();
      disposeObject(this.root);
    }
  };
}

/**
 * A camera pose that holds the whole subject clear of the bottom console.
 *
 * The app frames a scene from `cameraPose`, adjusting only for aspect ratio; a
 * pose authored by hand therefore has to guess both the size of the subject and
 * how much of the screen the console is covering. Measuring the subject instead
 * removes both guesses, and is why every prototype scene here authors a
 * direction and nothing else.
 *
 * `headroom` above 1 backs the camera off further, and `lift` (as a fraction of
 * the distance) moves the target down, which moves the subject up the frame.
 * The defaults keep the subject inside roughly the top two thirds — the part of
 * the screen the console does not reach.
 *
 * @param {THREE.Object3D} subject
 * @param {{ position: THREE.Vector3, target: THREE.Vector3 }} authored
 */
export function fitPose(subject, authored, { headroom = 1, lift = 0.09 } = {}) {
  subject.updateWorldMatrix(true, true);
  const sphere = new THREE.Box3().setFromObject(subject).getBoundingSphere(new THREE.Sphere());
  if (!Number.isFinite(sphere.radius) || sphere.radius <= 0) return authored;

  // Half of the app's default vertical field of view. The app widens it on a
  // narrow window and re-frames accordingly, so this only has to be right for
  // the shape of the subject, not for the size of the window.
  const halfFov = THREE.MathUtils.degToRad(21);
  // How much of the frame height the subject may use, and how far the target
  // drops to lift it clear of the console. The two are related: the subject
  // spans `usable` of the frame around the target, so the lift can be at most
  // (1 - usable) / 2 of it before the top of the subject leaves the frame —
  // which is exactly how the whole-body view lost the top of its head.
  const usable = 0.7;
  const distance = (sphere.radius / (usable * Math.tan(halfFov))) * headroom;

  const direction = authored.position.clone().sub(authored.target);
  if (direction.lengthSq() === 0) direction.set(0, 0, 1);
  direction.normalize();

  const target = sphere.center.clone();
  target.y -= lift * distance;
  return { position: target.clone().addScaledVector(direction, distance), target };
}
