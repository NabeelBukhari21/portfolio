/**
 * Face-rig math (no dependencies).
 * Aligns a live 478-point MediaPipe face to the canonical face model with a
 * similarity transform (Horn's quaternion method), so we can separate
 * head pose (rotation) from expression (per-vertex deltas).
 */

export type Vec3Array = Float32Array; // packed x,y,z

/** Largest-eigenvalue eigenvector of a symmetric 4x4 matrix (Jacobi). */
function maxEigenvector4(a: number[][]): number[] {
  const n = 4;
  const A = a.map((r) => r.slice());
  const V = [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ];
  for (let sweep = 0; sweep < 24; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += A[p][q] * A[p][q];
    if (off < 1e-18) break;
    for (let p = 0; p < n; p++) {
      for (let q = p + 1; q < n; q++) {
        if (Math.abs(A[p][q]) < 1e-14) continue;
        const theta = (A[q][q] - A[p][p]) / (2 * A[p][q]);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = A[k][p];
          const akq = A[k][q];
          A[k][p] = c * akp - s * akq;
          A[k][q] = s * akp + c * akq;
        }
        for (let k = 0; k < n; k++) {
          const apk = A[p][k];
          const aqk = A[q][k];
          A[p][k] = c * apk - s * aqk;
          A[q][k] = s * apk + c * aqk;
        }
        for (let k = 0; k < n; k++) {
          const vkp = V[k][p];
          const vkq = V[k][q];
          V[k][p] = c * vkp - s * vkq;
          V[k][q] = s * vkp + c * vkq;
        }
      }
    }
  }
  let best = 0;
  for (let i = 1; i < n; i++) if (A[i][i] > A[best][best]) best = i;
  return [V[0][best], V[1][best], V[2][best], V[3][best]];
}

export type Similarity = {
  /** unit quaternion (x,y,z,w) rotating canonical → live */
  q: [number, number, number, number];
  /** 3x3 row-major rotation canonical → live */
  R: number[];
  s: number;
  ca: [number, number, number];
  cb: [number, number, number];
};

/** Fit live ≈ s·R·canon + t over the first `count` points. */
export function fitSimilarity(canon: ArrayLike<number>, live: ArrayLike<number>, count: number): Similarity {
  let ax = 0, ay = 0, az = 0, bx = 0, by = 0, bz = 0;
  for (let i = 0; i < count; i++) {
    ax += canon[i * 3]; ay += canon[i * 3 + 1]; az += canon[i * 3 + 2];
    bx += live[i * 3]; by += live[i * 3 + 1]; bz += live[i * 3 + 2];
  }
  ax /= count; ay /= count; az /= count; bx /= count; by /= count; bz /= count;
  let Sxx = 0, Sxy = 0, Sxz = 0, Syx = 0, Syy = 0, Syz = 0, Szx = 0, Szy = 0, Szz = 0, aa = 0;
  for (let i = 0; i < count; i++) {
    const x = canon[i * 3] - ax, y = canon[i * 3 + 1] - ay, z = canon[i * 3 + 2] - az;
    const u = live[i * 3] - bx, v = live[i * 3 + 1] - by, w = live[i * 3 + 2] - bz;
    Sxx += x * u; Sxy += x * v; Sxz += x * w;
    Syx += y * u; Syy += y * v; Syz += y * w;
    Szx += z * u; Szy += z * v; Szz += z * w;
    aa += x * x + y * y + z * z;
  }
  const N = [
    [Sxx + Syy + Szz, Syz - Szy, Szx - Sxz, Sxy - Syx],
    [Syz - Szy, Sxx - Syy - Szz, Sxy + Syx, Szx + Sxz],
    [Szx - Sxz, Sxy + Syx, -Sxx + Syy - Szz, Syz + Szy],
    [Sxy - Syx, Szx + Sxz, Syz + Szy, -Sxx - Syy + Szz],
  ];
  const [qw, qx, qy, qz] = maxEigenvector4(N);
  const R = [
    1 - 2 * (qy * qy + qz * qz), 2 * (qx * qy - qz * qw), 2 * (qx * qz + qy * qw),
    2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz), 2 * (qy * qz - qx * qw),
    2 * (qx * qz - qy * qw), 2 * (qy * qz + qx * qw), 1 - 2 * (qx * qx + qy * qy),
  ];
  // scale = Σ b·(R a) / Σ |a|²
  let num = 0;
  for (let i = 0; i < count; i++) {
    const x = canon[i * 3] - ax, y = canon[i * 3 + 1] - ay, z = canon[i * 3 + 2] - az;
    const rx = R[0] * x + R[1] * y + R[2] * z;
    const ry = R[3] * x + R[4] * y + R[5] * z;
    const rz = R[6] * x + R[7] * y + R[8] * z;
    num += (live[i * 3] - bx) * rx + (live[i * 3 + 1] - by) * ry + (live[i * 3 + 2] - bz) * rz;
  }
  const s = num / (aa || 1);
  return { q: [qx, qy, qz, qw], R, s, ca: [ax, ay, az], cb: [bx, by, bz] };
}

/** Map live points back into canonical space: R^T (p - cb)/s + ca. Writes into `out`. */
export function unproject(fit: Similarity, live: ArrayLike<number>, n: number, out: Float32Array) {
  const { R, s, ca, cb } = fit;
  const inv = 1 / (s || 1);
  for (let i = 0; i < n; i++) {
    const x = live[i * 3] - cb[0], y = live[i * 3 + 1] - cb[1], z = live[i * 3 + 2] - cb[2];
    out[i * 3] = (R[0] * x + R[3] * y + R[6] * z) * inv + ca[0];
    out[i * 3 + 1] = (R[1] * x + R[4] * y + R[7] * z) * inv + ca[1];
    out[i * 3 + 2] = (R[2] * x + R[5] * y + R[8] * z) * inv + ca[2];
  }
}

/** Normalised MediaPipe landmarks → right-handed metric-ish space (x right, y up, z toward camera). */
export function toMetric(lm: ArrayLike<number>, n: number, w: number, h: number, out: Float32Array) {
  for (let i = 0; i < n; i++) {
    out[i * 3] = lm[i * 3] * w;
    out[i * 3 + 1] = -lm[i * 3 + 1] * h;
    out[i * 3 + 2] = -lm[i * 3 + 2] * w;
  }
}

/** Euler angles (degrees) from a canonical→live rotation, for display. */
export function eulerDeg(R: number[]) {
  const yaw = Math.atan2(R[2], R[8]);
  const pitch = Math.asin(Math.max(-1, Math.min(1, -R[5])));
  const roll = Math.atan2(R[3], R[4]);
  const d = 180 / Math.PI;
  return { yaw: yaw * d, pitch: pitch * d, roll: roll * d };
}
