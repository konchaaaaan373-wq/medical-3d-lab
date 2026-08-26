/**
 * Whether the viewer has asked the system for reduced motion.
 *
 * What that changes here is deliberately narrow. The heartbeat, the remodelling
 * and the guided sequence are the content — switching them off would leave a
 * still picture of a subject whose whole point is that it moves, which is not
 * an accessible version of this scene, it is a different and emptier one.
 *
 * What it does switch off is the motion that carries no information: the idle
 * camera drift, and the eased camera moves between framings, which become cuts.
 * Those are the parts that move without saying anything.
 *
 * Read live rather than cached, so a viewer who changes the setting does not
 * have to reload.
 *
 * @returns {boolean}
 */
export function prefersReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}
