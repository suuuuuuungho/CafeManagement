import { useEffect, useRef } from "react";

const VERTEX_SHADER = `attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAGMENT_SHADER = `precision highp float;
uniform vec2 u_resolution;

void main() {
    float dotSpacing = 30.0;
    float dotSize = 1.0;

    vec2 gridPos = mod(gl_FragCoord.xy, dotSpacing);
    float dist = length(gridPos - vec2(dotSpacing * 0.5));
    float dot = 1.0 - smoothstep(dotSize * 0.5, dotSize, dist);

    vec3 dotColor = vec3(0.85);
    vec3 bgColor = vec3(1.0);
    vec3 finalColor = mix(bgColor, dotColor, dot * 0.4);

    gl_FragColor = vec4(finalColor, 1.0);
}`;

function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  return shader;
}

/**
 * Shared decorative background used behind all three pages (order/admin/display).
 * Static dot grid rendered via WebGL, matching the reference design system —
 * no time/mouse uniforms since this pattern doesn't animate.
 */
export function DotGridBackground({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return;
    const webgl = gl as WebGLRenderingContext;

    function syncSize() {
      const w = canvas!.clientWidth || 1280;
      const h = canvas!.clientHeight || 720;
      if (canvas!.width !== w || canvas!.height !== h) {
        canvas!.width = w;
        canvas!.height = h;
      }
    }

    const resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(canvas);
    syncSize();

    const program = webgl.createProgram()!;
    webgl.attachShader(program, compileShader(webgl, webgl.VERTEX_SHADER, VERTEX_SHADER));
    webgl.attachShader(program, compileShader(webgl, webgl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    webgl.linkProgram(program);
    webgl.useProgram(program);

    const buffer = webgl.createBuffer();
    webgl.bindBuffer(webgl.ARRAY_BUFFER, buffer);
    webgl.bufferData(webgl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), webgl.STATIC_DRAW);
    const posLoc = webgl.getAttribLocation(program, "a_position");
    webgl.enableVertexAttribArray(posLoc);
    webgl.vertexAttribPointer(posLoc, 2, webgl.FLOAT, false, 0, 0);

    const uResolution = webgl.getUniformLocation(program, "u_resolution");

    let raf = 0;
    function render() {
      webgl.viewport(0, 0, canvas!.width, canvas!.height);
      if (uResolution) webgl.uniform2f(uResolution, canvas!.width, canvas!.height);
      webgl.drawArrays(webgl.TRIANGLE_STRIP, 0, 4);
      raf = requestAnimationFrame(render);
    }
    render();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className={`absolute inset-0 w-full h-full pointer-events-none opacity-40 ${className}`}>
      <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}
