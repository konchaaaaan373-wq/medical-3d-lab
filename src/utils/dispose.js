/**
 * Recursively free GPU resources for a subtree.
 * Scenes call this in `dispose()` so switching themes never leaks memory.
 */
export function disposeObject(root) {
  root.traverse((obj) => {
    if (obj.geometry) obj.geometry.dispose();
    const material = obj.material;
    if (!material) return;
    const materials = Array.isArray(material) ? material : [material];
    for (const mat of materials) {
      for (const value of Object.values(mat)) {
        if (value && value.isTexture) value.dispose();
      }
      mat.dispose();
    }
  });
  root.parent?.remove(root);
}
