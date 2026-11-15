import { CalibrationProfile } from '../types/game';

const CALIBRATION_STORAGE_KEY = 'ghost_fruit_calibration_profile';

export class CalibrationManager {
  public static loadProfile(
    cameraDeviceId: string,
    isPortrait: boolean
  ): CalibrationProfile | null {
    try {
      const stored = localStorage.getItem(CALIBRATION_STORAGE_KEY);
      if (!stored) return null;

      const profile: CalibrationProfile = JSON.parse(stored);

      // Invalida se trocou de câmera ou se a orientação (paisagem vs retrato) mudou significativamente
      if (
        profile.cameraDeviceId &&
        cameraDeviceId &&
        profile.cameraDeviceId !== cameraDeviceId
      ) {
        return null;
      }

      if (profile.isPortrait !== isPortrait) {
        return null;
      }

      return profile;
    } catch (e) {
      console.warn('Erro ao carregar calibração:', e);
      return null;
    }
  }

  public static saveProfile(profile: CalibrationProfile): void {
    try {
      localStorage.setItem(CALIBRATION_STORAGE_KEY, JSON.stringify(profile));
    } catch (e) {
      console.error('Erro ao salvar perfil de calibração:', e);
    }
  }

  public static clearProfile(): void {
    localStorage.removeItem(CALIBRATION_STORAGE_KEY);
  }

  /**
   * Avalia a qualidade da calibração com base nos dados coletados.
   */
  public static evaluateQuality(
    holdStability: number, // jitter médio (pixels) no teste de 1 segundo central
    reachAreaRatio: number, // proporção da tela alcançada confortavelmente (0 a 1)
    averageSlashSpeed: number, // velocidade de corte registrada (pixels/ms)
    trackingStabilityRatio: number // % de frames com detecção válida
  ): {
    quality: 'Boa' | 'Regular' | 'Precisa ajustar';
    feedback: string[];
  } {
    const feedback: string[] = [];

    if (trackingStabilityRatio < 0.75) {
      feedback.push('Rastreamento instável. Melhore a iluminação do ambiente e evite luz de fundo.');
    }

    if (holdStability > 45) {
      feedback.push('Tremor ou instabilidade detectados. Apoie o cotovelo ou posicione melhor o dispositivo.');
    }

    if (reachAreaRatio < 0.3) {
      feedback.push('Área de alcance muito limitada. Afaste-se um pouco da câmera para enquadrar melhor o movimento.');
    }

    if (averageSlashSpeed < 0.35) {
      feedback.push('Velocidade de corte muito baixa. Faça movimentos mais decididos e rápidos como uma lâmina.');
    }

    let quality: 'Boa' | 'Regular' | 'Precisa ajustar' = 'Boa';

    if (feedback.length >= 2 || trackingStabilityRatio < 0.65) {
      quality = 'Precisa ajustar';
    } else if (feedback.length === 1 || trackingStabilityRatio < 0.85) {
      quality = 'Regular';
    }

    return { quality, feedback };
  }
}
