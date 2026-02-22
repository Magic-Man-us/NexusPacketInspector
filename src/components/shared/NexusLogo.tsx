/**
 * Collapsing-star torus logo.
 *
 * Each dot orbits on a circular path that passes through the center —
 * like matter being pulled into a singularity, passing through, and
 * curving back around (toroidal vortex flow). Staggered timing creates
 * continuous inflow. Dots shrink/dim at center and grow bright at the
 * edges, giving a "collapsing star" feel with an optical illusion twist:
 * the brain can't decide if it's collapsing inward or expanding outward.
 */
export function NexusLogo({ size = 36 }: { size?: number }) {
  const c = size / 2;
  const R = size * 0.22;  // orbit radius = distance from center to orbit center
  const N = 10;           // dot count
  const T = 3;            // period (seconds)
  const K = 17;           // keyframe samples (every 22.5°)

  const dots = Array.from({ length: N }, (_, i) => {
    const theta = (i / N) * 2 * Math.PI;
    // Orbit center sits at distance R from icon center, at angle θ
    const ox = c + R * Math.cos(theta);
    const oy = c + R * Math.sin(theta);
    // Phase chosen so the dot passes through icon center at t=0
    const phi = Math.PI + theta;
    // Stagger each dot's start time
    const delay = -(i / N) * T;

    const cxArr: string[] = [];
    const cyArr: string[] = [];
    const rArr: string[] = [];
    const opArr: string[] = [];

    for (let k = 0; k < K; k++) {
      const alpha = (2 * Math.PI * k) / (K - 1) + phi;
      const x = ox + R * Math.cos(alpha);
      const y = oy + R * Math.sin(alpha);

      // Normalized distance from icon center (0 = at center, 1 = max)
      const dx = x - c;
      const dy = y - c;
      const d = Math.sqrt(dx * dx + dy * dy) / (2 * R);

      cxArr.push(x.toFixed(1));
      cyArr.push(y.toFixed(1));
      // Tiny at center (collapsed), full size at edge (star point)
      rArr.push((size * 0.012 + size * 0.048 * d).toFixed(2));
      // Dim at center, bright at edge
      opArr.push((0.15 + 0.85 * d).toFixed(2));
    }

    return {
      i,
      delay,
      cx: cxArr.join(";"),
      cy: cyArr.join(";"),
      r: rArr.join(";"),
      op: opArr.join(";"),
    };
  });

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      style={{ width: size, height: size, overflow: "visible" }}
    >
      <defs>
        <radialGradient id="nexusGlow">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.7" />
          <stop offset="60%" stopColor="var(--accent)" stopOpacity="0.15" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Center singularity glow */}
      <circle cx={c} cy={c} r={R * 0.7} fill="url(#nexusGlow)">
        <animate
          attributeName="opacity"
          values="0.4;0.7;0.4"
          dur="1.5s"
          repeatCount="indefinite"
        />
      </circle>

      {/* Collapsing-star orbit dots */}
      {dots.map((d) => (
        <circle key={d.i} fill="var(--accent)" cx={c} cy={c} r="1">
          <animate
            attributeName="cx"
            values={d.cx}
            dur={`${T}s`}
            begin={`${d.delay}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="cy"
            values={d.cy}
            dur={`${T}s`}
            begin={`${d.delay}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="r"
            values={d.r}
            dur={`${T}s`}
            begin={`${d.delay}s`}
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values={d.op}
            dur={`${T}s`}
            begin={`${d.delay}s`}
            repeatCount="indefinite"
          />
        </circle>
      ))}

      {/* Singularity core */}
      <circle
        cx={c}
        cy={c}
        r={size * 0.018}
        fill="var(--accent)"
        opacity="0.9"
      />
    </svg>
  );
}
