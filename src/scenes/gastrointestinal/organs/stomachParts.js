import * as THREE from 'three';
import { wallMaterial } from '../../shared/materials.js';
import { nearestU, tubeParts } from '../../shared/anatomy/tubeParts.js';
import {
  PYLORIC_SPHINCTER_AT,
  buildEsophagus,
  stomachCalibre,
  stomachPath,
} from './stomach.js';

/**
 * The same stomach, cut into the lengths anatomy names.
 *
 * Not a second stomach. `stomach.js` owns the shape — the path along the
 * greater curvature and the calibre along it — and this reads both from there;
 * change the shape and this changes with it. What is different is the purpose:
 * `buildStomach` returns one wall because a peristaltic wave travels along one
 * wall, and this returns a wall per named region because a reader pointing at
 * the antrum has to hit the antrum and not the stomach.
 *
 * ## Where the boundaries come from
 *
 * The calibre profile in `stomach.js` already names them: it is written as
 * fundus at 0, body at 0.42, incisura at 0.62, antrum at 0.82 and the pyloric
 * canal at 1. The divisions below are those, taken as the midpoints between the
 * named calibres rather than as numbers of their own — so the region a part
 * covers and the calibre it is drawn at cannot come apart.
 *
 * The **cardia** is the exception, and deliberately so: it is not a length of
 * the greater curvature, it is where the oesophagus opens in. So it is found
 * from the oesophagus — the fraction of the stomach's path nearest to where
 * that tube ends — rather than written down here. Move the oesophagus and the
 * cardia moves with it.
 *
 * ## What this does not claim
 *
 * The parts are full rings of the tube. A cardia is a region on the lesser
 * curvature side and this makes it a collar; the incisura angularis is a notch
 * on the lesser curvature and this has only the narrowing that goes with it.
 * There are no wall layers, no rugae and no volumes anywhere in this file.
 */

/** The named regions, as fractions of the stomach's own path. */
export const STOMACH_REGION_IDS = Object.freeze(['fundus', 'cardia', 'body', 'antrum', 'pyloric-canal']);

export const STOMACH_PART_COLORS = Object.freeze({
  fundus: '#d99a94',
  cardia: '#c98f96',
  body: '#d08a86',
  antrum: '#c07f7c',
  'pyloric-canal': '#b47472',
  sphincter: '#f0b9ae',
  esophagus: '#c9a2a6',
});

/**
 * Build the stomach as named parts, with the oesophagus that opens into it.
 *
 * @param {{colors?: Record<string, string>, opacity?: number}} [options]
 */
export function buildStomachParts({ colors = STOMACH_PART_COLORS, opacity = 0.94 } = {}) {
  const object = new THREE.Group();
  object.name = 'stomach-parts';

  const curve = stomachPath();
  const radiusAt = stomachCalibre();
  const esophagus = buildEsophagus();

  // Where the oesophagus arrives, in the stomach's own frame.
  const junction = esophagus.curve.getPointAt(1);
  const cardiaAt = nearestU(curve, junction);
  // Short, because the cardia is short. Given a wide span it renders as a
  // collar around the whole stomach — a band of a different colour cutting the
  // organ in two — and what a reader should see is one stomach with a zone in
  // it, not three tubes stacked.
  const cardia = { from: Math.max(0.02, cardiaAt - 0.025), to: Math.min(0.4, cardiaAt + 0.03) };

  const regions = [
    // The dome above the opening. It stops where the cardia starts, which is
    // the whole reason the fundus is a dome rather than the top of the body.
    { id: 'fundus', from: 0, to: cardia.from },
    { id: 'cardia', from: cardia.from, to: cardia.to },
    // Body to the midpoint between the incisura and the antrum: the antrum
    // begins where the tube has finished narrowing at the angle.
    { id: 'body', from: cardia.to, to: 0.72 },
    { id: 'antrum', from: 0.72, to: 0.92 },
    { id: 'pyloric-canal', from: 0.92, to: 1 },
  ];

  const built = tubeParts(curve, radiusAt, regions, {
    radial: 26,
    steps: 200,
    // The two free ends close as domes rather than as cut discs.
    roundEnds: 0.05,
    material: (part) => wallMaterial({ color: colors[part.id], opacity }),
  });
  for (const part of built.parts) object.add(part.mesh);

  // The sphincter, as its own ring at the position `stomach.js` puts it.
  const sphincterGeometry = new THREE.TorusGeometry(0.15, 0.055, 12, 28);
  const sphincter = new THREE.Mesh(sphincterGeometry, wallMaterial({ color: colors.sphincter, opacity: 1 }));
  sphincter.position.copy(curve.getPointAt(PYLORIC_SPHINCTER_AT));
  sphincter.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 0, 1),
    curve.getTangentAt(PYLORIC_SPHINCTER_AT).normalize()
  );
  sphincter.name = 'pyloric-sphincter';
  object.add(sphincter);

  esophagus.object.material.color.set(colors.esophagus);
  object.add(esophagus.object);

  const index = new Map(built.parts.map((part) => [part.id, part]));

  return {
    object,
    curve,
    parts: built.parts,
    part: (id) => index.get(id) ?? null,
    sphincter,
    esophagus,
    /** Where the oesophagus opens in, as a fraction of the stomach's path. */
    cardiaAt,
    anchors: {
      fundus: curve.getPointAt(0.06),
      cardia: curve.getPointAt(cardiaAt),
      antrum: curve.getPointAt(0.82),
      pylorus: curve.getPointAt(PYLORIC_SPHINCTER_AT),
    },
    dispose() {
      built.dispose();
      sphincterGeometry.dispose();
      sphincter.material.dispose();
      esophagus.dispose();
    },
  };
}
