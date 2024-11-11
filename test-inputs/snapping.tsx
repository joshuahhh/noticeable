/// <reference path="./types.ts" />

// # snappy grid without dead spots

// this slider controls the size of the snapping attractor... at 0,
// there's no snapping. at 0.5, it's all snapping all the time.

const stickyFraction = view(
  Inputs.range([0, 0.5], { step: 0.01, value: 0.25 }),
);

Plot.line(
  Array.from({ length: spacing * 3 }, (_, i) => ({
    x: i,
    y: sticky(i, spacing),
  })),
  { x: "x", y: "y" },
).plot();

// jsx
display(
  <svg width={width} height={height} style={{ backgroundColor: "#ddd" }}>
    {/* grid of gray dots */}
    {Array.from({ length: width / spacing }, (_, i) =>
      Array.from({ length: height / spacing }, (_, j) => (
        <circle
          key={`${i}-${j}`}
          cx={i * spacing}
          cy={j * spacing}
          r={1}
          fill="gray"
        />
      )),
    )}
    {/* red rectangle at position, draggable */}
    <rect
      x={position[0]}
      y={position[1]}
      width={spacing * 2}
      height={spacing * 2}
      fill="#f88"
      style={{ cursor: "move" }}
      onMouseDown={(e) => {
        const initialMouse = [e.clientX, e.clientY];
        const initialPosition = position;
        const onMove = (e) => {
          setPosition([
            sticky(e.clientX - initialMouse[0] + initialPosition[0], spacing),
            sticky(e.clientY - initialMouse[1] + initialPosition[1], spacing),
          ]);
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      }}
    />
  </svg>,
);

const spacing = 40;
const width = 800;
const height = 1000;

const position = Mutable([100, 100]);
const setPosition = (value) => (position.value = value);

position;

function sticky(mouse, spacing) {
  const remainder = mouse % spacing;
  let remainderNorm = remainder / spacing;
  if (remainderNorm < stickyFraction) {
    remainderNorm = 0;
  } else if (remainderNorm >= 1 - stickyFraction) {
    remainderNorm = 1;
  } else {
    remainderNorm = (remainderNorm - stickyFraction) / (1 - 2 * stickyFraction);
  }
  return mouse - remainder + remainderNorm * spacing;
}

const interp = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.00308905, 0.00756292, 0.010869, 0.0133737,
    0.0152462, 0.0166449, 0.0176552, 0.0183412, 0.018735, 0.0188666,
  ],
  [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.00773484, 0.016159, 0.0225241, 0.0273231,
    0.0309677, 0.0336766, 0.035637, 0.0369645, 0.0377316, 0.0379829,
  ],
  [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0152, 0.0268518, 0.0357131, 0.0424669,
    0.0475891, 0.0514478, 0.054244, 0.0561413, 0.057241, 0.0575957,
  ],
  [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0.00830766, 0.0264072, 0.0402377, 0.0509617,
    0.0591722, 0.0655041, 0.0702634, 0.0737435, 0.0761068, 0.0774789, 0.0779258,
  ],
  [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0.0225047, 0.0417134, 0.0567937, 0.0685913,
    0.0777931, 0.0849437, 0.0903633, 0.0943365, 0.097049, 0.0986329, 0.0991548,
  ],
  [
    0, 0, 0, 0, 0, 0, 0, 0, 0.0180823, 0.0419535, 0.0611671, 0.0765368,
    0.0887924, 0.0984731, 0.106071, 0.111892, 0.116176, 0.119121, 0.120845,
    0.121412,
  ],
  [
    0, 0, 0, 0, 0, 0, 0, 0.0174812, 0.0439963, 0.0661848, 0.0844463, 0.099383,
    0.111522, 0.121257, 0.12897, 0.134932, 0.139359, 0.142412, 0.144203,
    0.144792,
  ],
  [
    0, 0, 0, 0, 0, 0, 0.0251326, 0.0513196, 0.0743766, 0.0942071, 0.110993,
    0.125027, 0.136611, 0.146058, 0.153613, 0.159501, 0.163905, 0.166961,
    0.168753, 0.169346,
  ],
  [
    0, 0, 0, 0, 0.0207362, 0.0438597, 0.0667995, 0.0883747, 0.107975, 0.125294,
    0.140331, 0.153114, 0.16386, 0.172726, 0.179905, 0.185551, 0.189799,
    0.192753, 0.194499, 0.195077,
  ],
  [
    0.0331358, 0.0361202, 0.044649, 0.0577513, 0.0739332, 0.0917373, 0.109898,
    0.127476, 0.143889, 0.158744, 0.171877, 0.183267, 0.192981, 0.2011,
    0.207726, 0.212989, 0.216972, 0.219759, 0.221409, 0.221954,
  ],
  [
    0.0951087, 0.0972983, 0.103563, 0.113235, 0.125487, 0.139242, 0.153597,
    0.167845, 0.181402, 0.193923, 0.205185, 0.215113, 0.223688, 0.230939,
    0.236924, 0.241701, 0.245343, 0.247899, 0.249419, 0.24992,
  ],
  [
    0.152683, 0.154292, 0.158948, 0.166244, 0.175528, 0.186173, 0.197482,
    0.208894, 0.219964, 0.230351, 0.239839, 0.248327, 0.255729, 0.262055,
    0.267318, 0.27155, 0.27479, 0.277074, 0.278438, 0.27889,
  ],
  [
    0.207007, 0.208191, 0.211665, 0.217145, 0.224238, 0.23243, 0.241279,
    0.250329, 0.259232, 0.267702, 0.275543, 0.282615, 0.288857, 0.294231,
    0.29874, 0.302389, 0.305192, 0.30718, 0.308364, 0.308761,
  ],
  [
    0.258902, 0.259771, 0.262365, 0.266463, 0.271819, 0.278075, 0.284884,
    0.291937, 0.298944, 0.305689, 0.311994, 0.317741, 0.322854, 0.32729,
    0.331026, 0.334069, 0.336421, 0.338084, 0.339084, 0.339416,
  ],
  [
    0.309, 0.309641, 0.311541, 0.314547, 0.318504, 0.323147, 0.328258, 0.333596,
    0.338945, 0.344129, 0.349021, 0.35351, 0.357528, 0.361038, 0.364012,
    0.366442, 0.368324, 0.36966, 0.370466, 0.370728,
  ],
  [
    0.35779, 0.35824, 0.359569, 0.361685, 0.364463, 0.367761, 0.371411,
    0.375237, 0.379104, 0.382871, 0.38645, 0.389753, 0.392722, 0.395326,
    0.397543, 0.399356, 0.400769, 0.401778, 0.402378, 0.402578,
  ],
  [
    0.40567, 0.405966, 0.406802, 0.408146, 0.409923, 0.412038, 0.414382,
    0.416854, 0.419361, 0.421816, 0.424159, 0.426329, 0.428286, 0.430007,
    0.431475, 0.432686, 0.433626, 0.434295, 0.434694, 0.43483,
  ],
  [
    0.45297, 0.453112, 0.453525, 0.454181, 0.455042, 0.456072, 0.457222,
    0.458435, 0.459668, 0.460881, 0.462038, 0.463112, 0.464083, 0.46494,
    0.465673, 0.466279, 0.466745, 0.46708, 0.467282, 0.46735,
  ],
  [
    0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
    0.5, 0.5, 0.5, 0.5, 0.5,
  ],
];
function stickyX(mouse) {
  const spacing = 40; // only works this way
  let [x, y] = mouse;
  let rx = x % spacing,
    ry = y % spacing;
  if (ry >= spacing / 2) {
    ry = spacing - ry;
  }
  if (rx < spacing / 2) {
    return x - rx + interp[Math.floor(rx)][Math.floor(ry)] * spacing;
  } else {
    return (
      x -
      rx +
      spacing -
      interp[Math.floor(spacing - rx)][Math.floor(ry)] * spacing
    );
  }
}
function stickyXY(mouse) {
  return [stickyX(mouse), stickyX([mouse[1], mouse[0]])];
}

// jsx
display(
  <svg width={width} height={height} style={{ backgroundColor: "#ddd" }}>
    {/* grid of gray dots */}
    {Array.from({ length: width / spacing }, (_, i) =>
      Array.from({ length: height / spacing }, (_, j) => (
        <circle
          key={`${i}-${j}`}
          cx={i * spacing}
          cy={j * spacing}
          r={1}
          fill="gray"
        />
      )),
    )}
    {/* red rectangle at position, draggable */}
    <rect
      x={position[0]}
      y={position[1]}
      width={spacing * 2}
      height={spacing * 2}
      fill="#f88"
      style={{ cursor: "move" }}
      onMouseDown={(e) => {
        const initialMouse = [e.clientX, e.clientY];
        const initialPosition = position;
        const onMove = (e) => {
          setPosition(
            stickyXY(
              [
                e.clientX - initialMouse[0] + initialPosition[0],
                e.clientY - initialMouse[1] + initialPosition[1],
              ],
              spacing,
            ),
          );
        };
        const onUp = () => {
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        };
        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      }}
    />
  </svg>,
);
