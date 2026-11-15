import React, { useEffect, useRef } from 'react';

interface LeafParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  vRot: number;
  tumble: number;
  vTumble: number;
  swayPhase: number;
  swaySpeed: number;
  color: string;
  alpha: number;
  type: 'maple' | 'oval' | 'sakura';
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  maxAlpha: number;
  growthRate: number;
  decayRate: number;
}

export const AnimatedTempleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // 1. Partículas de Folhas Shinobi (Folhas da Aldeia da Folha e Outono)
    const leafColors = [
      '#f97316', // Chakra flame orange
      '#ea580c', // Dark orange
      '#dc2626', // Uchiha ember red
      '#b91c1c', // Crimson
      '#f59e0b', // Amber
      '#eab308', // Gold
      '#22c55e', // Hidden Leaf green
      '#16a34a', // Leaf forest
    ];

    const leafCount = Math.min(48, Math.floor(width / 30));
    const leaves: LeafParticle[] = [];

    for (let i = 0; i < leafCount; i++) {
      leaves.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: 30 + Math.random() * 45, // vento suave para a direita
        vy: 25 + Math.random() * 40, // gravidade suave
        size: 10 + Math.random() * 14,
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 2.5,
        tumble: Math.random() * Math.PI * 2,
        vTumble: 1.5 + Math.random() * 2.5,
        swayPhase: Math.random() * Math.PI * 2,
        swaySpeed: 1.2 + Math.random() * 1.8,
        color: leafColors[Math.floor(Math.random() * leafColors.length)],
        alpha: 0.65 + Math.random() * 0.35,
        type: Math.random() > 0.4 ? 'maple' : Math.random() > 0.5 ? 'sakura' : 'oval',
      });
    }

    // 2. Sistema de Fumaça & Neblina Volumétrica Realista
    const smokeCount = 18;
    const smokePuffs: SmokePuff[] = [];

    for (let i = 0; i < smokeCount; i++) {
      smokePuffs.push({
        x: Math.random() * width,
        y: height * 0.35 + Math.random() * (height * 0.55),
        vx: 12 + Math.random() * 20, // brisa horizontal
        vy: (Math.random() - 0.5) * 4,
        radius: 120 + Math.random() * 180,
        alpha: Math.random() * 0.18,
        maxAlpha: 0.12 + Math.random() * 0.14,
        growthRate: 4 + Math.random() * 6,
        decayRate: 0.0006 + Math.random() * 0.0008,
      });
    }

    // Desenha formato de Folha Momiji / Ninja
    const drawLeaf = (
      c: CanvasRenderingContext2D,
      x: number,
      y: number,
      size: number,
      rot: number,
      tumble: number,
      color: string,
      alpha: number,
      type: 'maple' | 'oval' | 'sakura'
    ) => {
      c.save();
      c.translate(x, y);
      c.rotate(rot);
      // Efeito 3D de rodopiar no ar (tumble flip)
      const scaleX = Math.cos(tumble);
      c.scale(scaleX, 1);

      c.globalAlpha = alpha;
      c.fillStyle = color;
      c.shadowColor = color;
      c.shadowBlur = 4;

      c.beginPath();
      if (type === 'maple') {
        // Folha de bordo estilizada japonesa (3 a 5 pontas)
        c.moveTo(0, -size);
        c.quadraticCurveTo(size * 0.5, -size * 0.6, size * 0.8, -size * 0.2);
        c.quadraticCurveTo(size * 0.4, 0, size * 0.9, size * 0.4);
        c.quadraticCurveTo(size * 0.3, size * 0.5, 0, size);
        c.quadraticCurveTo(-size * 0.3, size * 0.5, -size * 0.9, size * 0.4);
        c.quadraticCurveTo(-size * 0.4, 0, -size * 0.8, -size * 0.2);
        c.quadraticCurveTo(-size * 0.5, -size * 0.6, 0, -size);
      } else if (type === 'sakura') {
        // Pétala suave com entalhe
        c.moveTo(0, -size);
        c.bezierCurveTo(size * 0.7, -size * 0.7, size * 0.7, size * 0.5, 0, size);
        c.bezierCurveTo(-size * 0.7, size * 0.5, -size * 0.7, -size * 0.7, 0, -size);
      } else {
        // Folha oval Shinobi com nervura
        c.moveTo(0, -size);
        c.quadraticCurveTo(size * 0.6, 0, 0, size);
        c.quadraticCurveTo(-size * 0.6, 0, 0, -size);
      }
      c.fill();

      // Haste da folha
      c.strokeStyle = 'rgba(0, 0, 0, 0.35)';
      c.lineWidth = 1;
      c.beginPath();
      c.moveTo(0, -size * 0.6);
      c.lineTo(0, size * 1.15);
      c.stroke();

      c.restore();
    };

    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      ctx.clearRect(0, 0, width, height);

      // 1. Renderiza Fumaça & Neblina Atmosférica
      for (const p of smokePuffs) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.radius += p.growthRate * dt;

        // Pulso de opacidade suave
        if (p.x > width + p.radius) {
          p.x = -p.radius * 1.5;
          p.y = height * 0.35 + Math.random() * (height * 0.55);
          p.radius = 120 + Math.random() * 160;
          p.alpha = 0.01;
        }

        if (p.alpha < p.maxAlpha) {
          p.alpha += 0.02 * dt;
        }

        // Desenha nuvem volumétrica suave com gradiente radial
        ctx.save();
        const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
        grad.addColorStop(0, `rgba(240, 215, 195, ${p.alpha * 0.85})`);
        grad.addColorStop(0.45, `rgba(215, 160, 130, ${p.alpha * 0.55})`);
        grad.addColorStop(0.8, `rgba(180, 110, 80, ${p.alpha * 0.2})`);
        grad.addColorStop(1, 'rgba(10, 14, 25, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 2. Renderiza Folhas Flutuantes Shinobi com física de vento
      for (const leaf of leaves) {
        leaf.swayPhase += leaf.swaySpeed * dt;
        const sway = Math.sin(leaf.swayPhase) * 35;

        leaf.x += (leaf.vx + sway * 0.5) * dt;
        leaf.y += leaf.vy * dt;
        leaf.rotation += leaf.vRot * dt;
        leaf.tumble += leaf.vTumble * dt;

        // Se sair da tela, recicla no topo ou à esquerda
        if (leaf.y > height + 40 || leaf.x > width + 40) {
          leaf.y = -30 - Math.random() * 40;
          leaf.x = Math.random() * (width * 1.1) - width * 0.1;
          leaf.rotation = Math.random() * Math.PI * 2;
        }

        drawLeaf(
          ctx,
          leaf.x,
          leaf.y,
          leaf.size,
          leaf.rotation,
          leaf.tumble,
          leaf.color,
          leaf.alpha,
          leaf.type
        );
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none select-none">
      {/* 1. Arte Vetorial em Alta Resolução do Templo Samurai (SVG Vetorial Nítido) */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 1200 1600"
          className="w-full h-full object-cover object-center filter brightness-95 contrast-105"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="skyGradAnim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fdf6e2" />
              <stop offset="35%" stopColor="#faecd0" />
              <stop offset="70%" stopColor="#f2d7b4" />
              <stop offset="100%" stopColor="#d89b65" />
            </linearGradient>

            <radialGradient id="sunGradAnim" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="40%" stopColor="#dc2626" />
              <stop offset="85%" stopColor="#b91c1c" />
              <stop offset="100%" stopColor="#991b1b" />
            </radialGradient>

            <radialGradient id="sunAura" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#ea580c" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#dc2626" stopOpacity="0" />
            </radialGradient>

            <linearGradient id="templeGlowAnim" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#dc2626" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#7f1d1d" stopOpacity="0.9" />
            </linearGradient>

            <filter id="softMistFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="10" />
            </filter>
          </defs>

          {/* Fundo do Céu */}
          <rect width="1200" height="1600" fill="url(#skyGradAnim)" />

          {/* Aura do Sol Nascente */}
          <circle cx="600" cy="740" r="480" fill="url(#sunAura)" className="animate-pulse" />

          {/* Sol Vermelho Shinobi */}
          <circle cx="600" cy="740" r="410" fill="url(#sunGradAnim)" />

          {/* Folhagens e Árvores da Direita (Animadas com Balanço Suave) */}
          <g className="origin-[1000px_700px] animate-sway-slow">
            {/* Nuvem de folhas distantes à direita */}
            <g fill="#ea8d75" opacity="0.75">
              <ellipse cx="940" cy="580" rx="140" ry="60" />
              <ellipse cx="1020" cy="540" rx="110" ry="50" />
              <ellipse cx="880" cy="620" rx="90" ry="40" />
              <ellipse cx="980" cy="670" rx="130" ry="55" />
              <ellipse cx="1080" cy="730" rx="120" ry="50" />
              <ellipse cx="950" cy="760" rx="150" ry="65" />
              <ellipse cx="860" cy="830" rx="110" ry="45" />
              <ellipse cx="1020" cy="840" rx="140" ry="60" />
            </g>

            {/* Copa dos Pinheiros à direita */}
            <g fill="#991b1b">
              <path d="M1020 540 C970 510, 920 550, 950 580 C910 595, 930 630, 980 635 C1030 640, 1070 615, 1080 585 C1090 555, 1050 530, 1020 540 Z" />
              <path d="M960 670 C910 650, 890 685, 920 710 C880 725, 900 760, 950 765 C1010 770, 1050 740, 1055 710 C1065 675, 1010 655, 960 670 Z" />
              <path d="M1000 790 C950 775, 930 805, 960 830 C920 845, 940 880, 990 885 C1050 890, 1090 860, 1095 830 C1105 795, 1050 775, 1000 790 Z" />
            </g>
          </g>

          {/* Folhagens e Árvores da Esquerda (Animadas com Balanço Orgânico) */}
          <g className="origin-[160px_600px] animate-sway-medium">
            {/* Folhagem distante esquerda */}
            <g fill="#e07d67" opacity="0.8">
              <ellipse cx="240" cy="480" rx="130" ry="45" />
              <ellipse cx="180" cy="520" rx="90" ry="35" />
              <ellipse cx="280" cy="540" rx="100" ry="40" />
              <ellipse cx="140" cy="620" rx="120" ry="45" />
              <ellipse cx="220" cy="660" rx="140" ry="50" />
              <ellipse cx="110" cy="710" rx="90" ry="35" />
              <ellipse cx="190" cy="780" rx="130" ry="50" />
            </g>

            {/* Clumps de folhas dos Pinheiros da esquerda */}
            <g fill="#881337">
              <path d="M120 450 C80 430, 40 460, 60 480 C30 490, 40 520, 80 525 C120 530, 160 510, 180 490 C210 470, 180 440, 120 450 Z" />
              <path d="M180 340 C140 320, 100 350, 120 375 C80 385, 90 415, 140 420 C190 425, 230 400, 240 375 C260 350, 230 325, 180 340 Z" />
              <path d="M90 560 C50 540, 20 575, 40 600 C10 610, 20 645, 70 650 C120 655, 170 635, 180 610 C200 580, 160 550, 90 560 Z" />
              <path d="M220 580 C180 560, 150 590, 170 615 C140 630, 160 660, 200 665 C250 670, 290 645, 300 620 C310 595, 270 565, 220 580 Z" />
              <path d="M70 680 C30 670, 10 705, 30 730 C5 745, 20 775, 60 780 C110 785, 150 760, 160 735 C170 705, 130 685, 70 680 Z" />
              <path d="M180 730 C140 715, 120 745, 140 770 C110 785, 130 815, 170 820 C220 825, 260 800, 265 775 C275 745, 230 725, 180 730 Z" />
              <path d="M220 840 C180 825, 160 855, 180 880 C150 895, 170 925, 210 930 C260 935, 300 910, 305 885 C315 855, 270 835, 220 840 Z" />
            </g>

            {/* Tronco e galhos principais da árvore esquerda */}
            <g fill="#0b0f19">
              <path d="M-20 1200 Q120 1020 90 850 Q70 720 140 640 Q160 620 180 580 Q190 540 160 480 Q130 420 170 380 L185 390 Q150 430 180 480 Q210 530 195 580 Q180 620 155 645 Q85 730 110 860 Q140 1020 0 1210 Z" />
              <path d="M125 760 Q70 730 60 700 L75 695 Q85 720 135 745 Z" />
              <path d="M145 640 Q110 610 85 580 L100 575 Q125 600 155 625 Z" />
              <path d="M165 640 Q210 660 260 640 L265 655 Q210 675 155 655 Z" />
              <path d="M185 580 Q230 600 280 590 L285 605 Q230 615 175 595 Z" />
              <path d="M170 480 Q120 470 100 450 L115 440 Q130 460 175 465 Z" />
            </g>
          </g>

          {/* ================= PAGODA TEMPLE ================= */}
          {/* Brilho das janelas e portas do templo */}
          <rect x="360" y="1040" width="480" height="180" fill="url(#templeGlowAnim)" />
          <rect x="420" y="850" width="360" height="90" fill="url(#templeGlowAnim)" opacity="0.8" />
          <rect x="460" y="690" width="280" height="60" fill="url(#templeGlowAnim)" opacity="0.8" />

          {/* Silhueta e Telhados da Pagoda */}
          <g fill="#0b0e19">
            {/* Espiral Superior (Sorin) */}
            <rect x="597" y="230" width="6" height="140" />
            <polygon points="600,210 594,235 606,235" />
            <rect x="588" y="250" width="24" height="5" rx="2" />
            <rect x="588" y="262" width="24" height="5" rx="2" />
            <rect x="588" y="274" width="24" height="5" rx="2" />
            <rect x="588" y="286" width="24" height="5" rx="2" />
            <rect x="588" y="298" width="24" height="5" rx="2" />
            <rect x="588" y="310" width="24" height="5" rx="2" />
            <rect x="588" y="322" width="24" height="5" rx="2" />
            <rect x="588" y="334" width="24" height="5" rx="2" />
            <rect x="588" y="346" width="24" height="5" rx="2" />
            <polygon points="575,370 625,370 610,355 590,355" />

            {/* Telhado 3 (Topo) */}
            <path d="M600 370 Q520 450 440 480 Q530 465 600 465 Q670 465 760 480 Q680 450 600 370 Z" />
            <path d="M420 485 Q510 470 600 470 Q690 470 780 485 L795 470 Q695 450 600 450 Q505 450 405 470 Z" />
            <path d="M600 400 L560 450 L640 450 Z" />
            <polygon points="590,405 610,405 620,445 580,445" fill="#ea580c" />
            <rect x="470" y="480" width="260" height="40" />

            {/* Telhado 2 (Meio) */}
            <path d="M270 550 Q435 520 600 520 Q765 520 930 550 L955 525 Q775 490 600 490 Q425 490 245 525 Z" />
            <rect x="310" y="545" width="580" height="15" rx="3" />
            <rect x="330" y="570" width="540" height="25" />
            <rect x="340" y="565" width="520" height="4" fill="#c2410c" />
            <rect x="380" y="595" width="440" height="70" />
            <path d="M600 600 L530 660 L670 660 Z" fill="#080b13" />
            <path d="M600 610 L545 658 L655 658 Z" fill="#c2410c" />

            {/* Telhado 1 (Principal Grande) */}
            <path d="M120 730 Q360 670 600 670 Q840 670 1080 730 L1115 695 Q850 630 600 630 Q350 630 85 695 Z" />
            <rect x="180" y="725" width="840" height="20" rx="4" />
            <path d="M600 710 L440 810 L760 810 Z" fill="#080b13" />
            <path d="M600 725 L460 805 L740 805 Z" fill="#c2410c" />
            <rect x="250" y="790" width="700" height="40" />

            {/* Colunas do Salão Principal */}
            <rect x="290" y="830" width="24" height="390" />
            <rect x="390" y="830" width="20" height="390" />
            <rect x="490" y="830" width="22" height="390" />
            <rect x="589" y="830" width="22" height="390" />
            <rect x="688" y="830" width="22" height="390" />
            <rect x="790" y="830" width="20" height="390" />
            <rect x="886" y="830" width="24" height="390" />

            {/* Base e degraus de pedra do Templo */}
            <polygon points="340,1220 860,1220 900,1270 300,1270" fill="#141a2b" />
            <polygon points="300,1270 900,1270 940,1330 260,1330" fill="#0c101c" />
            <polygon points="260,1330 940,1330 990,1400 210,1400" fill="#070a12" />

            {/* Escadaria Central */}
            <polygon points="490,1220 710,1220 730,1260 470,1260" fill="#f5ede0" />
            <line x1="485" y1="1230" x2="715" y2="1230" stroke="#080b13" strokeWidth="3" />
            <line x1="480" y1="1240" x2="720" y2="1240" stroke="#080b13" strokeWidth="3" />
            <line x1="475" y1="1250" x2="725" y2="1250" stroke="#080b13" strokeWidth="3" />

            <polygon points="465,1260 735,1260 760,1320 440,1320" fill="#ede2ce" />
            <line x1="460" y1="1275" x2="740" y2="1275" stroke="#080b13" strokeWidth="3" />
            <line x1="450" y1="1290" x2="750" y2="1290" stroke="#080b13" strokeWidth="3" />
            <line x1="445" y1="1305" x2="755" y2="1305" stroke="#080b13" strokeWidth="3" />

            <polygon points="435,1320 765,1320 800,1400 400,1400" fill="#e0d1b6" />
            <line x1="425" y1="1340" x2="775" y2="1340" stroke="#080b13" strokeWidth="4" />
            <line x1="415" y1="1360" x2="785" y2="1360" stroke="#080b13" strokeWidth="4" />
            <line x1="405" y1="1380" x2="795" y2="1380" stroke="#080b13" strokeWidth="4" />

            {/* Chão e Silhueta de Rochas ao redor da base */}
            <path d="M0 1380 Q200 1350 400 1400 L800 1400 Q1000 1350 1200 1380 L1200 1600 L0 1600 Z" fill="#060910" />
            <path d="M0 1440 Q300 1400 600 1430 Q900 1400 1200 1440 L1200 1600 L0 1600 Z" fill="#03050a" />
          </g>
        </svg>
      </div>

      {/* 2. Camada de Fumaça Animada & Folhas Caídas (Canvas 60 FPS) */}
      <canvas ref={canvasRef} className="absolute inset-0 z-10 w-full h-full pointer-events-none" />

      {/* 3. Névoa Horizontal Ondulante em CSS (Camadas suaves com Blend Mode) */}
      <div className="absolute inset-x-0 bottom-0 h-96 z-10 pointer-events-none opacity-40 mix-blend-screen bg-gradient-to-t from-orange-950/60 via-amber-900/20 to-transparent animate-pulse" />

      {/* 4. Vinheta de Profundidade para Contraste do Card */}
      <div className="absolute inset-0 z-20 bg-gradient-to-t from-[#08090d] via-[#08090d]/45 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-20 bg-[#08090d]/30 backdrop-blur-[1px] pointer-events-none" />
    </div>
  );
};
