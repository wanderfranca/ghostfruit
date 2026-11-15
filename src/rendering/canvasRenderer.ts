import { CameraManager } from '../camera/cameraManager';
import {
  Fruit,
  Bomb,
  SlicedHalf,
  Particle,
  JuiceSplatter,
  FloatingText,
  BladePoint,
  HandDetectionOutput,
} from '../types/game';

export interface PortfolioRenderOptions {
  isPortfolioMode: boolean;
  playerName?: string;
  hud?: {
    score: number;
    hearts: number;
    comboMultiplier: number;
    remainingSeconds: number;
    level: number;
    superEnergy: number;
    personalBest?: number;
  };
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw new Error('Falha ao obter contexto 2D do Canvas');
    }
    this.ctx = context;
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public render(
    video: HTMLVideoElement | null,
    isFrontCamera: boolean,
    darkenPercent: number,
    beautyPercent: number,
    fruits: Fruit[],
    bombs: Bomb[],
    slicedHalves: SlicedHalf[],
    particles: Particle[],
    juiceSplatters: JuiceSplatter[],
    floatingTexts: FloatingText[],
    bladePoints: BladePoint[],
    handOutput: HandDetectionOutput | null,
    showSkeleton: boolean,
    isSuperActive: boolean,
    now: number,
    portfolioOptions?: PortfolioRenderOptions
  ): void {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const isPortfolio = !!portfolioOptions?.isPortfolioMode;
    const gameW = w;
    const gameH = isPortfolio ? Math.round(h * 0.60) : h;

    // 1. Limpa fundo
    ctx.fillStyle = '#06080e';
    ctx.fillRect(0, 0, w, h);

    // 2. Renderiza vídeo da câmera com filtro de embelezamento e suavização facial
    if (video && video.readyState >= 2 && !video.paused && !video.ended) {
      this.renderVideoWithBeauty(video, w, h, isFrontCamera, beautyPercent, 0, 0, gameW, gameH);
    }

    // 3. Escurecimento ajustável do cenário (0 a 80%) para contraste com as frutas
    const darkenAlpha = Math.max(0, Math.min(0.85, darkenPercent / 100));
    if (darkenAlpha > 0) {
      ctx.fillStyle = `rgba(5, 7, 15, ${darkenAlpha})`;
      ctx.fillRect(0, 0, gameW, gameH);
    }

    // Se estiver em modo portfólio, recorta a área de jogo para o topo
    ctx.save();
    if (isPortfolio) {
      ctx.beginPath();
      ctx.rect(0, 0, gameW, gameH);
      ctx.clip();
    }

    // 4. Manchas de suco espectral
    this.renderJuiceSplatters(juiceSplatters);

    // 5. Esqueleto da mão (opcional nas configurações)
    if (showSkeleton && handOutput && handOutput.rawLandmarks && video) {
      this.renderHandSkeleton(
        handOutput.rawLandmarks,
        video,
        w,
        h,
        isFrontCamera,
        0,
        0,
        gameW,
        gameH
      );
    }

    // 6. Frutas inteiras
    for (const fruit of fruits) {
      this.renderFruit(fruit, isSuperActive, now);
    }

    // 7. Metades cortadas de frutas
    for (const half of slicedHalves) {
      this.renderSlicedHalf(half);
    }

    // 8. Bombas
    for (const bomb of bombs) {
      this.renderBomb(bomb, now);
    }

    // 9. Partículas (gotas, faíscas, fumaça)
    this.renderParticles(particles);

    // 10. Rastro da Lâmina e Cursor da ponta do dedo
    this.renderBladeTrail(bladePoints, handOutput, isSuperActive, now);

    // 11. Textos flutuantes (+10, Combos, etc.)
    this.renderFloatingTexts(floatingTexts);

    // 12. Barra superior no topo do jogo (quando em modo portfólio para gravação limpa no LinkedIn)
    if (isPortfolio && portfolioOptions?.hud) {
      this.renderPortfolioTopBar(gameW, gameH, portfolioOptions.hud);
    }

    ctx.restore();

    // 13. Seção inferior em Modo Portfólio (Split 30% Webcam ao vivo + 70% Card Wander França)
    if (isPortfolio) {
      this.renderPortfolioBottomSection(video, isFrontCamera, beautyPercent, now, w, h, gameH);
    }
  }

  /**
   * Barra superior do jogo desenhada na gravação do modo portfólio
   */
  private renderPortfolioTopBar(
    gameW: number,
    gameH: number,
    hud: {
      score: number;
      hearts: number;
      comboMultiplier: number;
      remainingSeconds: number;
      level: number;
      superEnergy: number;
    }
  ): void {
    const ctx = this.ctx;
    ctx.save();

    const barH = 46;
    const grad = ctx.createLinearGradient(0, 0, 0, barH);
    grad.addColorStop(0, 'rgba(8, 12, 22, 0.95)');
    grad.addColorStop(1, 'rgba(8, 12, 22, 0.65)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, gameW, barH);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, barH);
    ctx.lineTo(gameW, barH);
    ctx.stroke();

    // Logo / Ícone
    ctx.fillStyle = '#f97316';
    ctx.font = 'bold 16px "Shojumaru", sans-serif';
    ctx.fillText('⚔️ GHOST FRUIT', 16, 29);

    // Pontuação
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Pontuação:', 185, 29);
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`${hud.score}`, 262, 29);

    // Combo
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Combo:', 315, 29);
    ctx.fillStyle = hud.comboMultiplier > 1 ? '#38bdf8' : '#94a3b8';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`x${hud.comboMultiplier}`, 370, 29);

    // Vidas
    ctx.fillStyle = '#cbd5e1';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Vidas:', 425, 29);
    let heartsStr = '';
    for (let i = 0; i < hud.hearts; i++) heartsStr += '❤️ ';
    for (let i = hud.hearts; i < 5; i++) heartsStr += '🤍 ';
    ctx.font = '14px sans-serif';
    ctx.fillText(heartsStr.trim(), 472, 29);

    // Tempo
    const m = Math.floor(hud.remainingSeconds / 60);
    const s = hud.remainingSeconds % 60;
    const timeStr = `${m}:${s < 10 ? '0' : ''}${s}`;
    ctx.fillStyle = hud.remainingSeconds <= 15 ? '#f87171' : '#fde047';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText(`⏱️ ${timeStr}`, gameW - 100, 29);

    ctx.restore();
  }

  /**
   * Renderiza a seção inferior do portfólio inspirada no print anexado:
   * 30% coluna esquerda com a webcam ao vivo do desenvolvedor (🔴 AO VIVO • WEBCAM)
   * 70% coluna direita com card profissional Wander França (Cargos, Site, Stacks e Versões)
   */
  private renderPortfolioBottomSection(
    video: HTMLVideoElement | null,
    isFrontCamera: boolean,
    beautyPercent: number,
    now: number,
    totalW: number,
    totalH: number,
    gameH: number
  ): void {
    const ctx = this.ctx;
    const bottomY = gameH;
    const bottomH = totalH - bottomY;

    // Fundo da seção inferior
    ctx.fillStyle = '#06080e';
    ctx.fillRect(0, bottomY, totalW, bottomH);

    // Divisória sutil
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, bottomY);
    ctx.lineTo(totalW, bottomY);
    ctx.stroke();

    const pad = Math.round(totalW * 0.018); // margem responsiva
    const availW = totalW - pad * 3;
    const col1W = Math.round(availW * 0.30); // 30% da largura
    const col2W = availW - col1W;           // 70% da largura
    const colH = bottomH - pad * 2;
    const col1X = pad;
    const col1Y = bottomY + pad;
    const col2X = col1X + col1W + pad;
    const col2Y = bottomY + pad;

    // 1. Coluna Esquerda: Webcam ao vivo (30%)
    ctx.save();
    this.drawRoundedRect(ctx, col1X, col1Y, col1W, colH, 18);
    ctx.clip();

    if (video && video.readyState >= 2 && !video.paused && !video.ended) {
      this.renderVideoWithBeauty(
        video,
        totalW,
        totalH,
        isFrontCamera,
        beautyPercent,
        col1X,
        col1Y,
        col1W,
        colH
      );
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(col1X, col1Y, col1W, colH);
    }
    ctx.restore();

    // Borda arredondada suave da webcam
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, col1X, col1Y, col1W, colH, 18);
    ctx.stroke();

    // Badge "🔴 AO VIVO • WEBCAM"
    const badgeH = 26;
    const badgeY = col1Y + colH - badgeH - 12;
    const badgeX = col1X + 12;
    const badgeText = 'AO VIVO • WEBCAM';
    ctx.font = 'bold 11px sans-serif';
    const badgeTextW = ctx.measureText(badgeText).width;
    const badgeW = badgeTextW + 28;

    ctx.fillStyle = 'rgba(10, 15, 28, 0.9)';
    this.drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 13);
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Ponto vermelho pulsante
    const dotPulse = (Math.sin(now / 200) + 1) / 2;
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 6 + dotPulse * 6;
    ctx.beginPath();
    ctx.arc(badgeX + 12, badgeY + badgeH / 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = '#ffffff';
    ctx.fillText(badgeText, badgeX + 22, badgeY + badgeH / 2 + 4);
    ctx.restore();

    // 2. Coluna Direita: Card Profissional de Wander França (70%)
    ctx.save();
    const cardGrad = ctx.createLinearGradient(col2X, col2Y, col2X + col2W, col2Y + colH);
    cardGrad.addColorStop(0, '#0c1220');
    cardGrad.addColorStop(0.5, '#0f172b');
    cardGrad.addColorStop(1, '#090d16');
    ctx.fillStyle = cardGrad;
    this.drawRoundedRect(ctx, col2X, col2Y, col2W, colH, 20);
    ctx.fill();

    ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
    ctx.lineWidth = 2;
    this.drawRoundedRect(ctx, col2X, col2Y, col2W, colH, 20);
    ctx.stroke();

    // Barra de destaque vertical ciano brilhante
    const barX = col2X + 26;
    const barY = col2Y + 32;
    const barW = 6;
    const barH = 56;
    ctx.fillStyle = '#00d2ff';
    ctx.shadowColor = '#00d2ff';
    ctx.shadowBlur = 10;
    this.drawRoundedRect(ctx, barX, barY, barW, barH, 3);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Nome: Wander França
    const textX = barX + barW + 16;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px "Shojumaru", sans-serif';
    ctx.fillText('Wander França', textX, barY + 25);

    // Cargos / Subtítulo: DEV FullStack | Data Scientist | Head Support
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 15px sans-serif';
    ctx.fillText('DEV FullStack | Data Scientist | Head Support', textX, barY + 49);

    // Badges / Tags
    const badgeRowY = barY + 84;
    this.drawTextBadge(ctx, textX, badgeRowY, '⚔️ Ghost Fruit', '#f97316', '#ffedd5');
    this.drawTextBadge(ctx, textX + 115, badgeRowY, '🧠 Visão Computacional', '#38bdf8', '#e0f2fe');
    this.drawTextBadge(ctx, textX + 295, badgeRowY, '📊 Data Scientist', '#a855f7', '#f3e8ff');

    // Site oficial & Portfólio: suporteoberon.com.br/wander-franca/
    const siteY = badgeRowY + 44;
    ctx.fillStyle = '#00d2ff';
    ctx.font = 'bold 18px sans-serif';
    ctx.shadowColor = 'rgba(0, 210, 255, 0.5)';
    ctx.shadowBlur = 8;
    ctx.fillText('suporteoberon.com.br/wander-franca/', textX, siteY);
    ctx.shadowBlur = 0;

    // Stacks e versões solicitadas pelo usuário:
    const stackY = siteY + 28;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '500 13px sans-serif';
    ctx.fillText(
      'Ghost Fruit • React 19 • TypeScript 5.9 • Vite 6 • MediaPipe Tasks Vision 0.10.22 • Tailwind CSS 3.4',
      textX,
      stackY
    );

    ctx.restore();
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private drawTextBadge(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    text: string,
    borderColor: string,
    textColor: string
  ): void {
    ctx.save();
    ctx.font = 'bold 11px sans-serif';
    const textW = ctx.measureText(text).width;
    const padX = 10;
    const h = 22;
    const w = textW + padX * 2;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
    this.drawRoundedRect(ctx, x, y - 14, w, h, 6);
    ctx.fill();
    ctx.strokeStyle = borderColor;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = textColor;
    ctx.fillText(text, x + padX, y);
    ctx.restore();
  }

  /**
   * Renderiza a câmera com filtro de embelezamento facial (skin smoothing),
   * simulando os filtros de suavização de pele das câmeras de smartphones modernos.
   * Utiliza difusão de luz (soft-glow) e ajuste de tonalidade,
   * atenuando ruído de webcam, imperfeições e uniformizando o tom da pele.
   */
  private renderVideoWithBeauty(
    video: HTMLVideoElement,
    canvasW: number,
    canvasH: number,
    isMirrored: boolean,
    beautyPercent: number,
    destX: number = 0,
    destY: number = 0,
    destW: number = canvasW,
    destH: number = canvasH
  ): void {
    const ctx = this.ctx;
    const transform = CameraManager.calculateTransform(
      video.videoWidth,
      video.videoHeight,
      canvasW,
      canvasH,
      isMirrored,
      destX,
      destY,
      destW,
      destH
    );

    ctx.save();
    ctx.beginPath();
    ctx.rect(destX, destY, destW, destH);
    ctx.clip();

    if (transform.isMirrored) {
      ctx.translate(destX * 2 + destW, 0);
      ctx.scale(-1, 1);
    }

    if (beautyPercent <= 0) {
      // Sem filtro de embelezamento: vídeo original nítido
      ctx.drawImage(
        video,
        transform.sourceX,
        transform.sourceY,
        transform.sourceWidth,
        transform.sourceHeight,
        transform.destX,
        transform.destY,
        transform.destWidth,
        transform.destHeight
      );
    } else {
      const beautyRatio = Math.max(0, Math.min(1.0, beautyPercent / 100));

      // 1ª Camada: Vídeo base com correção de iluminação, contraste suave e calor cutâneo
      const baseBrightness = 1.0 + beautyRatio * 0.05; // iluminação sutil (+5%)
      const baseContrast = 1.0 - beautyRatio * 0.04;   // suaviza sombras duras
      const baseSaturate = 1.0 + beautyRatio * 0.08;   // tons de pele mais vívidos e corados

      ctx.filter = `brightness(${baseBrightness}) contrast(${baseContrast}) saturate(${baseSaturate})`;
      ctx.drawImage(
        video,
        transform.sourceX,
        transform.sourceY,
        transform.sourceWidth,
        transform.sourceHeight,
        transform.destX,
        transform.destY,
        transform.destWidth,
        transform.destHeight
      );

      // 2ª Camada: Passagem de difusão suave (Soft-Glow / Skin Smoothing)
      const blurRadius = 2.0 + beautyRatio * 3.5; // 2px a 5.5px
      const glowOpacity = 0.22 + beautyRatio * 0.22; // suavidade sem ofuscar

      ctx.globalAlpha = glowOpacity;
      ctx.globalCompositeOperation = 'screen';
      ctx.filter = `blur(${blurRadius}px) brightness(1.06) saturate(1.05)`;

      ctx.drawImage(
        video,
        transform.sourceX,
        transform.sourceY,
        transform.sourceWidth,
        transform.sourceHeight,
        transform.destX,
        transform.destY,
        transform.destWidth,
        transform.destHeight
      );

      // Reseta estado para os demais elementos do jogo
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1.0;
      ctx.filter = 'none';
    }

    ctx.restore();
  }

  private renderJuiceSplatters(splatters: JuiceSplatter[]): void {
    const ctx = this.ctx;
    for (const s of splatters) {
      ctx.save();
      ctx.globalAlpha = s.alpha * 0.45;
      ctx.fillStyle = s.color;

      ctx.beginPath();
      ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
      ctx.fill();

      for (const d of s.droplets) {
        ctx.beginPath();
        ctx.arc(s.x + d.ox, s.y + d.oy, d.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private renderFruit(fruit: Fruit, isSuperActive: boolean, now: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(fruit.x, fruit.y);
    ctx.rotate(fruit.rotation);

    const r = fruit.radius;

    // Brilho exterior espectral (glow de chakra ninja)
    ctx.shadowColor = fruit.glowColor;
    ctx.shadowBlur = fruit.isSpecial ? 26 : 14;

    if (fruit.type === 'banana') {
      // ===== BANANA: Formato curvado clássico em crescente =====
      ctx.beginPath();
      ctx.moveTo(-r * 0.95, r * 0.25);
      ctx.bezierCurveTo(-r * 0.5, -r * 0.85, r * 0.5, -r * 0.85, r * 0.95, r * 0.25);
      ctx.bezierCurveTo(r * 0.45, -r * 0.45, -r * 0.45, -r * 0.45, -r * 0.95, r * 0.25);
      ctx.closePath();

      const bananaGrad = ctx.createLinearGradient(-r, -r * 0.5, r, r * 0.5);
      bananaGrad.addColorStop(0, '#fde047');
      bananaGrad.addColorStop(0.5, '#eab308');
      bananaGrad.addColorStop(1, '#ca8a04');
      ctx.fillStyle = bananaGrad;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#a16207';
      ctx.stroke();

      // Cume longitudinal (faceta da banana)
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(-r * 0.85, r * 0.15);
      ctx.bezierCurveTo(-r * 0.45, -r * 0.65, r * 0.45, -r * 0.65, r * 0.85, r * 0.15);
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.stroke();

      // Caule marrom na ponta
      ctx.fillStyle = '#713f12';
      ctx.beginPath();
      ctx.arc(-r * 0.95, r * 0.25, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // Ponta preta
      ctx.fillStyle = '#451a03';
      ctx.beginPath();
      ctx.arc(r * 0.95, r * 0.25, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (fruit.type === 'apple') {
      // ===== MAÇÃ: Silhueta de maçã com covinha, cabinho e folha verde =====
      ctx.beginPath();
      // Formato entalhado no topo e na base
      ctx.moveTo(0, -r * 0.7);
      ctx.bezierCurveTo(r * 0.5, -r * 1.15, r * 1.25, -r * 0.3, r * 0.9, r * 0.6);
      ctx.bezierCurveTo(r * 0.6, r * 1.05, r * 0.1, r * 0.9, 0, r * 0.75);
      ctx.bezierCurveTo(-r * 0.1, r * 0.9, -r * 0.6, r * 1.05, -r * 0.9, r * 0.6);
      ctx.bezierCurveTo(-r * 1.25, -r * 0.3, -r * 0.5, -r * 1.15, 0, -r * 0.7);
      ctx.closePath();

      const appleGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      appleGrad.addColorStop(0, '#ef4444');
      appleGrad.addColorStop(0.65, '#dc2626');
      appleGrad.addColorStop(1, '#991b1b');
      ctx.fillStyle = appleGrad;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#7f1d1d';
      ctx.stroke();

      ctx.shadowBlur = 0;
      // Brilho de verniz curvo no ombro da maçã
      ctx.beginPath();
      ctx.ellipse(-r * 0.4, -r * 0.4, r * 0.32, r * 0.16, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fill();

      // Cabinho de madeira marrom
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.7);
      ctx.quadraticCurveTo(r * 0.2, -r * 1.15, r * 0.15, -r * 1.35);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#451a03';
      ctx.stroke();

      // Folhinha verde
      ctx.beginPath();
      ctx.ellipse(r * 0.35, -r * 1.15, r * 0.24, r * 0.12, Math.PI / 6, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (fruit.type === 'watermelon') {
      // ===== MELANCIA: Esfera verde 3D com listras serrilhadas e brilho =====
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      const melonGrad = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.15, 0, 0, r);
      melonGrad.addColorStop(0, '#4ade80');
      melonGrad.addColorStop(0.5, '#16a34a');
      melonGrad.addColorStop(1, '#14532d');
      ctx.fillStyle = melonGrad;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#052e16';
      ctx.stroke();

      ctx.shadowBlur = 0;
      // Listras escuras sinuosas da melancia
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = r * 0.14;
      ctx.lineCap = 'round';
      for (let offset = -0.65; offset <= 0.65; offset += 0.32) {
        ctx.beginPath();
        const startX = offset * r;
        ctx.moveTo(startX, -r * 0.85);
        ctx.quadraticCurveTo(startX + r * 0.25, 0, startX, r * 0.85);
        ctx.stroke();
      }

      // Brilho esférico
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.35, r * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
      ctx.fill();

      // Nó de caule
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.arc(0, -r * 0.95, 3.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (fruit.type === 'orange') {
      // ===== LARANJA: Textura cítrica, cabinho com folha e gomos =====
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      const orangeGrad = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
      orangeGrad.addColorStop(0, '#fb923c');
      orangeGrad.addColorStop(0.65, '#ea580c');
      orangeGrad.addColorStop(1, '#c2410c');
      ctx.fillStyle = orangeGrad;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#9a3412';
      ctx.stroke();

      ctx.shadowBlur = 0;
      // Brilho especular
      ctx.beginPath();
      ctx.arc(-r * 0.35, -r * 0.35, r * 0.24, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.fill();

      // Folhinha no topo
      ctx.beginPath();
      ctx.ellipse(r * 0.25, -r * 0.85, r * 0.22, r * 0.11, -Math.PI / 4, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e';
      ctx.fill();
      ctx.strokeStyle = '#15803d';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Cálice verde no topo
      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(0, -r * 0.88, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (fruit.type === 'dragonfruit') {
      // ===== PITAYA: Corpo magenta com escamas de dragão verdes saindo =====
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
      const pitayaGrad = ctx.createRadialGradient(-r * 0.25, -r * 0.25, r * 0.1, 0, 0, r);
      pitayaGrad.addColorStop(0, '#f43f5e');
      pitayaGrad.addColorStop(0.6, '#e11d48');
      pitayaGrad.addColorStop(1, '#9f1239');
      ctx.fillStyle = pitayaGrad;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#881337';
      ctx.stroke();

      ctx.shadowBlur = 0;
      // Escamas verdes salientes enroladas
      ctx.fillStyle = '#22c55e';
      ctx.strokeStyle = '#84cc16';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const ang = (i * Math.PI) / 3;
        ctx.beginPath();
        const px = Math.cos(ang) * (r * 0.88);
        const py = Math.sin(ang) * (r * 0.88);
        const tipX = Math.cos(ang) * (r * 1.22);
        const tipY = Math.sin(ang) * (r * 1.22);
        ctx.moveTo(px - 6, py);
        ctx.quadraticCurveTo(px, py - 4, tipX, tipY);
        ctx.quadraticCurveTo(px + 4, py + 6, px, py + 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    } else {
      // ===== STARFRUIT / CARAMBOLA: Estrela ninja amarela translúcida =====
      ctx.beginPath();
      const points = 5;
      for (let i = 0; i < points * 2; i++) {
        const rad = i % 2 === 0 ? r : r * 0.52;
        const a = (i * Math.PI) / points - Math.PI / 2;
        const px = Math.cos(a) * rad;
        const py = Math.sin(a) * rad;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      const starGrad = ctx.createRadialGradient(0, 0, r * 0.15, 0, 0, r);
      starGrad.addColorStop(0, '#fef08a');
      starGrad.addColorStop(0.6, '#eab308');
      starGrad.addColorStop(1, '#84cc16');
      ctx.fillStyle = starGrad;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ca8a04';
      ctx.stroke();

      ctx.shadowBlur = 0;
      // Linhas de cume douradas para cada ponta
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2;
      for (let i = 0; i < points; i++) {
        const a = (i * 2 * Math.PI) / points - Math.PI / 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        ctx.stroke();
      }
    }

    // Se for fruta especial, aura de chakra dourado pulsante
    if (fruit.isSpecial) {
      const pulse = 1.0 + Math.sin(now * 0.008) * 0.08;
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#facc15';
      ctx.shadowBlur = 18;
      ctx.beginPath();
      ctx.arc(0, 0, r * pulse + 5, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderSlicedHalf(half: SlicedHalf): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(half.x, half.y);
    ctx.rotate(half.rotation);

    const r = half.radius;

    // Desenha casca de meia fruta (semicírculo)
    ctx.beginPath();
    if (half.isLeftHalf) {
      ctx.arc(0, 0, r, Math.PI * 0.5, Math.PI * 1.5);
    } else {
      ctx.arc(0, 0, r, -Math.PI * 0.5, Math.PI * 0.5);
    }
    ctx.closePath();
    ctx.fillStyle = half.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.stroke();

    // Rind/Margem branca intermediária (para melancia/laranja)
    ctx.beginPath();
    if (half.isLeftHalf) {
      ctx.arc(0, 0, r * 0.88, Math.PI * 0.5, Math.PI * 1.5);
    } else {
      ctx.arc(0, 0, r * 0.88, -Math.PI * 0.5, Math.PI * 0.5);
    }
    ctx.closePath();
    ctx.fillStyle = '#fffbeb';
    ctx.fill();

    // Polpa interna exposta no corte
    ctx.beginPath();
    if (half.isLeftHalf) {
      ctx.arc(0, 0, r * 0.78, Math.PI * 0.5, Math.PI * 1.5);
    } else {
      ctx.arc(0, 0, r * 0.78, -Math.PI * 0.5, Math.PI * 0.5);
    }
    ctx.closePath();
    ctx.fillStyle = half.internalColor;
    ctx.fill();

    // Sementes ou detalhes internos conforme a fruta
    if (half.type === 'watermelon') {
      ctx.fillStyle = '#0f172a';
      const dir = half.isLeftHalf ? -1 : 1;
      const seedOffsets = [
        { x: dir * r * 0.35, y: -r * 0.25 },
        { x: dir * r * 0.5, y: 0 },
        { x: dir * r * 0.35, y: r * 0.25 },
        { x: dir * r * 0.2, y: -r * 0.1 },
      ];
      for (const s of seedOffsets) {
        ctx.beginPath();
        ctx.ellipse(s.x, s.y, 3.5, 2.2, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (half.type === 'orange') {
      // Gomos cítricos triangulares
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 1.5;
      const dir = half.isLeftHalf ? -1 : 1;
      for (let a = -Math.PI * 0.4; a <= Math.PI * 0.4; a += Math.PI * 0.2) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a) * (dir * r * 0.72), Math.sin(a) * (r * 0.72));
        ctx.stroke();
      }
    } else {
      ctx.fillStyle = half.seedColor;
      const dir = half.isLeftHalf ? -1 : 1;
      ctx.beginPath();
      ctx.arc(dir * r * 0.35, 0, 3, 0, Math.PI * 2);
      ctx.arc(dir * r * 0.25, -r * 0.25, 2.5, 0, Math.PI * 2);
      ctx.arc(dir * r * 0.25, r * 0.25, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderBomb(bomb: Bomb, now: number): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(bomb.x, bomb.y);
    ctx.rotate(bomb.rotation);

    const r = bomb.radius;

    // Brilho de perigo roxo/vermelho
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 18;

    // Corpo de metal escuro
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = '#11131c';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#dc2626';
    ctx.stroke();

    // Caveira / Símbolo espectral no centro
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ef4444';
    // Olho esquerdo
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.1, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // Olho direito
    ctx.beginPath();
    ctx.arc(r * 0.3, -r * 0.1, r * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // Boca
    ctx.fillRect(-r * 0.25, r * 0.25, r * 0.5, r * 0.12);

    // Pavio metálico no topo
    ctx.strokeStyle = '#e4e4e7';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.quadraticCurveTo(r * 0.3, -r * 1.3, r * 0.2, -r * 1.45);
    ctx.stroke();

    // Faíscas crepitantes no pavio
    const sparkX = r * 0.2 + (Math.random() - 0.5) * 8;
    const sparkY = -r * 1.45 + (Math.random() - 0.5) * 8;
    ctx.fillStyle = Math.random() > 0.5 ? '#facc15' : '#ef4444';
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(sparkX, sparkY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderBladeTrail(
    points: BladePoint[],
    handOutput: HandDetectionOutput | null,
    isSuperActive: boolean,
    now: number
  ): void {
    const ctx = this.ctx;
    if (points.length < 2) {
      // Se tiver apenas a posição atual do dedo, desenha o cursor luminoso
      if (handOutput && handOutput.detected && handOutput.indexTip) {
        this.renderFingerCursor(handOutput.indexTip.x, handOutput.indexTip.y, handOutput.isIndexExtended, isSuperActive);
      }
      return;
    }

    ctx.save();

    // Rastro luminoso contínuo da lâmina
    for (let i = 1; i < points.length; i++) {
      const p1 = points[i - 1];
      const p2 = points[i];

      // Não desenha rastro se o corte estava desativado
      if (!p1.isCutting && !p2.isCutting) continue;

      const age = now - p2.timestamp;
      const progress = Math.max(0, 1.0 - age / 200); // 0 a 1 desvanecimento rápido

      const thickness = (isSuperActive ? 18 : 12) * progress;

      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (isSuperActive) {
        // Lâmina de Fogo Kyuubi / Chakra Flame durante o Super
        ctx.strokeStyle = `rgba(255, 120, 0, ${progress * 0.95})`;
        ctx.shadowColor = '#ea580c';
      } else {
        // Lâmina Katana Shinobi Dourada / Laranja
        ctx.strokeStyle = `rgba(255, 152, 0, ${progress * 0.85})`;
        ctx.shadowColor = '#ff9800';
      }

      ctx.shadowBlur = isSuperActive ? 22 : 14;
      ctx.lineWidth = thickness;
      ctx.stroke();

      // Núcleo branco/dourado incandescente
      ctx.strokeStyle = `rgba(255, 255, 240, ${progress})`;
      ctx.lineWidth = thickness * 0.4;
      ctx.shadowBlur = 0;
      ctx.stroke();
    }

    ctx.restore();

    // Cursor luminoso na ponta do dedo
    if (handOutput && handOutput.detected && handOutput.indexTip) {
      this.renderFingerCursor(handOutput.indexTip.x, handOutput.indexTip.y, handOutput.isIndexExtended, isSuperActive);
    }
  }

  private renderFingerCursor(
    x: number,
    y: number,
    isExtended: boolean,
    isSuperActive: boolean
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);

    const mainColor = isSuperActive ? '#ea580c' : isExtended ? '#ff9800' : '#94a3b8';

    // Anel externo
    ctx.strokeStyle = mainColor;
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = isExtended ? 16 : 4;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, isExtended ? 12 : 7, 0, Math.PI * 2);
    ctx.stroke();

    // Ponto central
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderHandSkeleton(
    landmarks: any[],
    video: HTMLVideoElement,
    canvasW: number,
    canvasH: number,
    isMirrored: boolean,
    destX: number = 0,
    destY: number = 0,
    destW: number = canvasW,
    destH: number = canvasH
  ): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.4)';
    ctx.lineWidth = 2;

    const connections = [
      [0, 1], [1, 2], [2, 3], [3, 4], // polegar
      [0, 5], [5, 6], [6, 7], [7, 8], // indicador
      [5, 9], [9, 10], [10, 11], [11, 12], // médio
      [9, 13], [13, 14], [14, 15], [15, 16], // anelar
      [13, 17], [17, 18], [18, 19], [19, 20], [0, 17], // mínimo e base
    ];

    const screenPoints = landmarks.map((lm) =>
      CameraManager.mapLandmarkToCanvas(
        lm.x,
        lm.y,
        video.videoWidth,
        video.videoHeight,
        canvasW,
        canvasH,
        isMirrored,
        destX,
        destY,
        destW,
        destH
      )
    );

    for (const [i, j] of connections) {
      const p1 = screenPoints[i];
      const p2 = screenPoints[j];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }

    ctx.fillStyle = '#00f0ff';
    for (const p of screenPoints) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private renderFloatingTexts(texts: FloatingText[]): void {
    const ctx = this.ctx;
    for (const t of texts) {
      ctx.save();
      ctx.globalAlpha = t.alpha;
      ctx.translate(t.x, t.y);
      ctx.scale(t.scale, t.scale);

      ctx.font = '900 24px "Shojumaru", "Orbitron", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Sombra preta para legibilidade sobre a câmera
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.lineWidth = 5;
      ctx.strokeText(t.text, 0, 0);

      // Texto colorido brilhante
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 10;
      ctx.fillText(t.text, 0, 0);

      ctx.restore();
    }
  }
}
