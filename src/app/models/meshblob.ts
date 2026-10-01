export interface MeshBlob {
  x: number; // % de position, -10 à 110
  y: number; // idem
  w: number; // % de largeur, 20 à 62
  h: number; // % de hauteur, 18 à 64
  hue: 1 | 2 | 3; // index du token --mesh-hue-N
}