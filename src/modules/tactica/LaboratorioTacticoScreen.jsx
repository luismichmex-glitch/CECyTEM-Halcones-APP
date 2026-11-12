import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import TopAppBar from '../../components/TopAppBar';
import {
  fetchJugadasTacticas,
  createJugadaTactica,
  updateJugadaTactica,
  deleteJugadaTactica,
} from '../../services/supabaseClient';

// Colores oficiales de trazo táctico
const COLORES_TRAZO = [
  { id: '#4DD8E8', label: 'Cian', bg: 'bg-[#4DD8E8]' },
  { id: '#FF7043', label: 'Coral', bg: 'bg-[#FF7043]' },
  { id: '#FACC15', label: 'Amarillo', bg: 'bg-[#FACC15]' },
  { id: '#FFFFFF', label: 'Blanco', bg: 'bg-white' },
];

const CATEGORIAS_EJERCICIO = [
  'Ejercicio',
  'Rondo y Posesión',
  'Salida de Balón',
  'Presión Alta',
  'ABP - Córner',
  'ABP - Tiro Libre',
  'Contraataque',
  'Finalización',
  'Circuito Físico-Técnico',
];

// Generador de ID único para elementos
const genId = (prefix = 'el') => `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

export default function LaboratorioTacticoScreen({
  onRefreshGlobal,
  isSyncingGlobal = false,
  syncStatus = 'online',
}) {
  // Información de la jugada
  const [titulo, setTitulo] = useState('Rondo 4v4 + 2 Comodines');
  const [categoria, setCategoria] = useState('Rondo y Posesión');
  const [rama, setRama] = useState('General');
  const [canchaTipo, setCanchaTipo] = useState('reducido'); // 'completa' | 'media' | 'reducido'
  const [notasEntrenador, setNotasEntrenador] = useState('');
  const [currentJugadaId, setCurrentJugadaId] = useState(null);

  // Sistema de Fotogramas (Keyframes)
  // Cada fotograma: { step: number, elementos: [...], trazos: [...] }
  const [frames, setFrames] = useState([
    {
      step: 1,
      elementos: [
        { id: 'ea_1', tipo: 'jugador_a', dorsal: 4, x: 25, y: 30 },
        { id: 'ea_2', tipo: 'jugador_a', dorsal: 5, x: 75, y: 30 },
        { id: 'ea_3', tipo: 'jugador_a', dorsal: 8, x: 25, y: 70 },
        { id: 'ea_4', tipo: 'jugador_a', dorsal: 10, x: 75, y: 70 },
        { id: 'eb_1', tipo: 'jugador_b', dorsal: 7, x: 40, y: 45 },
        { id: 'eb_2', tipo: 'jugador_b', dorsal: 9, x: 60, y: 55 },
        { id: 'com_1', tipo: 'comodin', dorsal: 'C', x: 50, y: 30 },
        { id: 'com_2', tipo: 'comodin', dorsal: 'C', x: 50, y: 70 },
        { id: 'balon_1', tipo: 'balon', x: 30, y: 32 },
        { id: 'cono_1', tipo: 'cono', x: 20, y: 20 },
        { id: 'cono_2', tipo: 'cono', x: 80, y: 20 },
        { id: 'cono_3', tipo: 'cono', x: 20, y: 80 },
        { id: 'cono_4', tipo: 'cono', x: 80, y: 80 },
      ],
      trazos: [],
    },
  ]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState(null);

  // Modo de interacción: 'mover' vs 'dibujar'
  const [modoInteraccion, setModoInteraccion] = useState('mover');
  const [tipoTrazo, setTipoTrazo] = useState('continua'); // 'continua' (movimiento) | 'punteada' (pase)
  const [colorTrazo, setColorTrazo] = useState('#4DD8E8');
  const [trazoEnCurso, setTrazoEnCurso] = useState(null);

  // Motor de Animación
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1); // 0.5, 1, 2
  const [animProgress, setAnimProgress] = useState(0); // 0 a (frames.length - 1)
  const [isRecording, setIsRecording] = useState(false);

  // Jugadas guardadas en Supabase
  const [jugadasGuardadas, setJugadasGuardadas] = useState([]);
  const [modalGuardadas, setModalGuardadas] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [cargandoLista, setCargandoLista] = useState(false);

  // Toast / Feedback
  const [feedback, setFeedback] = useState(null);
  const showFeedback = useCallback((msg, tone = 'cyan') => {
    setFeedback({ msg, tone });
    setTimeout(() => {
      setFeedback((prev) => (prev?.msg === msg ? null : prev));
    }, 3200);
  }, []);

  // Referencias para Pointer Events y Animación
  const pitchContainerRef = useRef(null);
  const draggingIdRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const lastTimeRef = useRef(null);
  const isPlayingRef = useRef(false);
  isPlayingRef.current = isPlaying;

  // Cargar lista de jugadas guardadas desde Supabase
  const cargarListaGuardadas = useCallback(async () => {
    setCargandoLista(true);
    try {
      const data = await fetchJugadasTacticas();
      setJugadasGuardadas(data);
    } catch (err) {
      console.error('Error cargando jugadas:', err);
    } finally {
      setCargandoLista(false);
    }
  }, []);

  useEffect(() => {
    cargarListaGuardadas();
  }, [cargarListaGuardadas]);

  // Frame activo actual
  const currentFrame = frames[currentStepIndex] || frames[0];

  // ==========================================
  // 1) MANEJO DE ELEMENTOS Y UTILERÍA
  // ==========================================
  const agregarElemento = (tipo) => {
    const elementosActuales = currentFrame.elementos || [];
    let nuevoDorsal = '';

    if (tipo === 'jugador_a') {
      const count = elementosActuales.filter((e) => e.tipo === 'jugador_a').length;
      nuevoDorsal = count + 1;
    } else if (tipo === 'jugador_b') {
      const count = elementosActuales.filter((e) => e.tipo === 'jugador_b').length;
      nuevoDorsal = count + 1;
    } else if (tipo === 'comodin') {
      nuevoDorsal = 'C';
    }

    const nuevoElemento = {
      id: genId(tipo),
      tipo,
      dorsal: nuevoDorsal,
      x: 50 + (Math.random() * 10 - 5),
      y: 50 + (Math.random() * 10 - 5),
    };

    setFrames((prevFrames) =>
      prevFrames.map((f, idx) => {
        if (idx === currentStepIndex) {
          return {
            ...f,
            elementos: [...(f.elementos || []), nuevoElemento],
          };
        }
        // Para fotogramas futuros en caso de que existan, también agregar el elemento para consistencia
        return {
          ...f,
          elementos: [...(f.elementos || []), { ...nuevoElemento }],
        };
      })
    );

    setSelectedElementId(nuevoElemento.id);
    showFeedback(`Agregado: ${tipo.replace('_', ' ')}`, 'cyan');
  };

  const eliminarElementoSeleccionado = () => {
    if (!selectedElementId) {
      showFeedback('Selecciona una ficha para eliminar', 'coral');
      return;
    }

    setFrames((prevFrames) =>
      prevFrames.map((f) => ({
        ...f,
        elementos: (f.elementos || []).filter((el) => el.id !== selectedElementId),
      }))
    );
    setSelectedElementId(null);
    showFeedback('Ficha eliminada del ejercicio', 'emerald');
  };

  // ==========================================
  // 2) POINTER EVENTS PARA ARRASTRE Y DIBUJO
  // ==========================================
  const handlePointerDownElemento = (e, id) => {
    if (modoInteraccion === 'dibujar') return;
    e.stopPropagation();
    e.preventDefault();
    setSelectedElementId(id);
    draggingIdRef.current = id;
    if (e.currentTarget.setPointerCapture) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerDownCancha = (e) => {
    if (modoInteraccion !== 'dibujar' || !pitchContainerRef.current) return;
    e.preventDefault();
    const rect = pitchContainerRef.current.getBoundingClientRect();
    const startX = ((e.clientX - rect.left) / rect.width) * 100;
    const startY = ((e.clientY - rect.top) / rect.height) * 100;

    const nuevoTrazo = {
      id: genId('trazo'),
      tipo: tipoTrazo,
      color: colorTrazo,
      puntos: [{ x: startX, y: startY }],
    };
    setTrazoEnCurso(nuevoTrazo);
  };

  const handlePointerMoveCancha = (e) => {
    if (!pitchContainerRef.current) return;
    const rect = pitchContainerRef.current.getBoundingClientRect();

    // Caso A: Arrastrar ficha
    if (draggingIdRef.current && modoInteraccion === 'mover') {
      e.preventDefault();
      const rawX = ((e.clientX - rect.left) / rect.width) * 100;
      const rawY = ((e.clientY - rect.top) / rect.height) * 100;
      const clampedX = Math.round(Math.max(4, Math.min(96, rawX)) * 10) / 10;
      const clampedY = Math.round(Math.max(4, Math.min(96, rawY)) * 10) / 10;

      const targetId = draggingIdRef.current;
      setFrames((prev) =>
        prev.map((f, idx) => {
          if (idx !== currentStepIndex) return f;
          return {
            ...f,
            elementos: (f.elementos || []).map((el) =>
              el.id === targetId ? { ...el, x: clampedX, y: clampedY } : el
            ),
          };
        })
      );
    }

    // Caso B: Dibujar con lápiz táctico
    if (trazoEnCurso && modoInteraccion === 'dibujar') {
      e.preventDefault();
      const currX = ((e.clientX - rect.left) / rect.width) * 100;
      const currY = ((e.clientY - rect.top) / rect.height) * 100;
      setTrazoEnCurso((prev) => ({
        ...prev,
        puntos: [...prev.puntos, { x: currX, y: currY }],
      }));
    }
  };

  const handlePointerUpCancha = (e) => {
    // Liberar arrastre de ficha
    if (draggingIdRef.current) {
      draggingIdRef.current = null;
    }

    // Finalizar trazo en curso y guardarlo en el frame actual
    if (trazoEnCurso) {
      if (trazoEnCurso.puntos.length > 2) {
        setFrames((prev) =>
          prev.map((f, idx) => {
            if (idx !== currentStepIndex) return f;
            return {
              ...f,
              trazos: [...(f.trazos || []), trazoEnCurso],
            };
          })
        );
      }
      setTrazoEnCurso(null);
    }
  };

  const handleDeshacerTrazo = () => {
    setFrames((prev) =>
      prev.map((f, idx) => {
        if (idx !== currentStepIndex) return f;
        const currentTrazos = f.trazos || [];
        return {
          ...f,
          trazos: currentTrazos.slice(0, -1),
        };
      })
    );
    showFeedback('Último trazo deshecho', 'cyan');
  };

  const handleBorrarTrazos = () => {
    setFrames((prev) =>
      prev.map((f, idx) => {
        if (idx !== currentStepIndex) return f;
        return {
          ...f,
          trazos: [],
        };
      })
    );
    showFeedback('Todos los trazos borrados del paso', 'coral');
  };

  // ==========================================
  // 3) LÍNEA DE TIEMPO Y FOTOGRAMAS (KEYFRAMES)
  // ==========================================
  const agregarPaso = () => {
    // Clonar los elementos del frame actual para moverlos en el nuevo paso
    const nuevoStep = frames.length + 1;
    const clonElementos = (currentFrame.elementos || []).map((el) => ({ ...el }));

    const nuevoFrame = {
      step: nuevoStep,
      elementos: clonElementos,
      trazos: [],
    };

    setFrames((prev) => [...prev, nuevoFrame]);
    setCurrentStepIndex(frames.length);
    showFeedback(`Paso ${nuevoStep} creado. Mueve las fichas a su nueva posición.`, 'emerald');
  };

  const eliminarPaso = (idxParaEliminar) => {
    if (frames.length <= 1) {
      showFeedback('No puedes eliminar el único paso del ejercicio', 'coral');
      return;
    }

    setFrames((prev) => {
      const filtrados = prev.filter((_, i) => i !== idxParaEliminar);
      return filtrados.map((f, i) => ({ ...f, step: i + 1 }));
    });

    if (currentStepIndex >= frames.length - 1) {
      setCurrentStepIndex(Math.max(0, frames.length - 2));
    }
    showFeedback('Paso eliminado', 'cyan');
  };

  // ==========================================
  // 4) MOTOR DE ANIMACIÓN CONTINUA (60 FPS)
  // ==========================================
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      return;
    }

    const durationPerStepMs = 1200 / playbackSpeed;
    lastTimeRef.current = performance.now();

    const loop = (time) => {
      if (!isPlayingRef.current) return;
      const delta = time - lastTimeRef.current;
      lastTimeRef.current = time;

      setAnimProgress((prev) => {
        const totalSteps = frames.length;
        if (totalSteps <= 1) {
          setIsPlaying(false);
          return 0;
        }

        const stepAdvance = delta / durationPerStepMs;
        const next = prev + stepAdvance;

        if (next >= totalSteps - 1) {
          // Bucle continuo
          return 0;
        }
        return next;
      });

      animFrameIdRef.current = requestAnimationFrame(loop);
    };

    animFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, frames.length]);

  // Posiciones calculadas para cada elemento (interpolar si está en animación)
  const elementosVisuales = useMemo(() => {
    if (!isPlaying || frames.length <= 1) {
      return currentFrame.elementos || [];
    }

    const stepBase = Math.floor(animProgress);
    const stepNext = Math.min(stepBase + 1, frames.length - 1);
    const alpha = animProgress - stepBase;

    const frameA = frames[stepBase] || frames[0];
    const frameB = frames[stepNext] || frameA;

    const mapB = new Map((frameB.elementos || []).map((el) => [el.id, el]));

    return (frameA.elementos || []).map((elA) => {
      const elB = mapB.get(elA.id);
      if (!elB) return elA;
      return {
        ...elA,
        x: elA.x + (elB.x - elA.x) * alpha,
        y: elA.y + (elB.y - elA.y) * alpha,
      };
    });
  }, [isPlaying, animProgress, frames, currentFrame]);

  // ==========================================
  // 5) GRABACIÓN / EXPORTACIÓN DE ANIMACIÓN
  // ==========================================
  const exportarAnimacionWebM = async () => {
    if (frames.length <= 1) {
      showFeedback('Agrega al menos 2 pasos para poder exportar video de la jugada', 'coral');
      return;
    }

    setIsRecording(true);
    showFeedback('Preparando grabación de la jugada táctica...', 'cyan');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = 720;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      const stream = canvas.captureStream(30);
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      } catch {
        mediaRecorder = new MediaRecorder(stream);
      }

      const chunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${titulo.replace(/\s+/g, '_')}_Tactico.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsRecording(false);
        showFeedback('¡Video táctico exportado y descargado con éxito!', 'emerald');
      };

      mediaRecorder.start();

      // Renderizar la animación en el canvas paso a paso
      const totalSteps = frames.length;
      const totalDurationSec = totalSteps * 1.5;
      const fps = 30;
      const totalFramesCount = Math.floor(totalDurationSec * fps);

      for (let frameIdx = 0; frameIdx < totalFramesCount; frameIdx++) {
        const progress = (frameIdx / totalFramesCount) * (totalSteps - 1);
        const stepBase = Math.floor(progress);
        const stepNext = Math.min(stepBase + 1, totalSteps - 1);
        const alpha = progress - stepBase;

        const fA = frames[stepBase];
        const fB = frames[stepNext];
        const mapB = new Map((fB.elementos || []).map((el) => [el.id, el]));

        // 1. Dibujar Césped
        ctx.fillStyle = '#0f3822';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Rayas de césped
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        for (let y = 0; y < canvas.height; y += 40) {
          ctx.fillRect(0, y, canvas.width, 20);
        }

        // Líneas de cancha
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 3;
        ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, Math.PI * 2);
        ctx.stroke();

        // 2. Dibujar Elementos Interpolados
        (fA.elementos || []).forEach((elA) => {
          const elB = mapB.get(elA.id) || elA;
          const currX = (elA.x + (elB.x - elA.x) * alpha) * (canvas.width / 100);
          const currY = (elA.y + (elB.y - elA.y) * alpha) * (canvas.height / 100);

          if (elA.tipo === 'jugador_a') {
            ctx.beginPath();
            ctx.arc(currX, currY, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#4DD8E8';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(elA.dorsal || 'A'), currX, currY);
          } else if (elA.tipo === 'jugador_b') {
            ctx.beginPath();
            ctx.arc(currX, currY, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#FF7043';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(elA.dorsal || 'B'), currX, currY);
          } else if (elA.tipo === 'comodin') {
            ctx.beginPath();
            ctx.arc(currX, currY, 16, 0, Math.PI * 2);
            ctx.fillStyle = '#FACC15';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#000000';
            ctx.stroke();
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('C', currX, currY);
          } else if (elA.tipo === 'balon') {
            ctx.beginPath();
            ctx.arc(currX, currY, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 2;
            ctx.stroke();
          } else {
            // Conos y otros
            ctx.fillStyle = '#FB923C';
            ctx.fillRect(currX - 8, currY - 8, 16, 16);
          }
        });

        // Pausa entre frames del render
        await new Promise((r) => setTimeout(r, 1000 / fps));
      }

      mediaRecorder.stop();
    } catch (err) {
      console.error('Error exportando video:', err);
      setIsRecording(false);
      showFeedback('Error al generar el video de la jugada', 'coral');
    }
  };

  // Exportar jugada como archivo JSON táctico
  const exportarArchivoJSON = () => {
    const payload = {
      titulo,
      categoria,
      rama,
      canchaTipo,
      notasEntrenador,
      frames,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${titulo.replace(/\s+/g, '_')}_Tactico.json`;
    a.click();
    URL.revokeObjectURL(url);
    showFeedback('Archivo táctico exportado', 'cyan');
  };

  // ==========================================
  // 6) GUARDAR / CARGAR EN SUPABASE
  // ==========================================
  const handleGuardarEnSupabase = async () => {
    if (!titulo.trim()) {
      showFeedback('Asigna un título a la jugada o ejercicio', 'coral');
      return;
    }

    setGuardando(true);
    try {
      const payload = {
        titulo: titulo.trim(),
        categoria,
        rama,
        cancha_tipo: canchaTipo,
        notas_entrenador: notasEntrenador,
        frames,
      };

      if (currentJugadaId) {
        await updateJugadaTactica(currentJugadaId, payload);
        showFeedback('¡Ejercicio actualizado en Supabase!', 'emerald');
      } else {
        const res = await createJugadaTactica(payload);
        if (res?.id) setCurrentJugadaId(res.id);
        showFeedback('¡Ejercicio guardado en Supabase!', 'emerald');
      }
      await cargarListaGuardadas();
    } catch (err) {
      console.error('Error guardando jugada en Supabase:', err);
      showFeedback('Error al guardar en Supabase', 'coral');
    } finally {
      setGuardando(false);
    }
  };

  const handleCargarJugada = (item) => {
    setCurrentJugadaId(item.id);
    setTitulo(item.titulo || 'Ejercicio');
    setCategoria(item.categoria || 'Ejercicio');
    setRama(item.rama || 'General');
    setCanchaTipo(item.cancha_tipo || 'completa');
    setNotasEntrenador(item.notas_entrenador || '');

    if (Array.isArray(item.frames) && item.frames.length > 0) {
      setFrames(item.frames);
      setCurrentStepIndex(0);
    }

    setModalGuardadas(false);
    showFeedback(`Ejercicio "${item.titulo}" cargado`, 'cyan');
  };

  const handleBorrarJugada = async (id, e) => {
    e.stopPropagation();
    const conf = window.confirm('¿Deseas eliminar este ejercicio táctico?');
    if (!conf) return;

    try {
      await deleteJugadaTactica(id);
      if (currentJugadaId === id) setCurrentJugadaId(null);
      showFeedback('Ejercicio eliminado', 'emerald');
      await cargarListaGuardadas();
    } catch (err) {
      showFeedback('Error al eliminar', 'coral');
    }
  };

  const handleNuevoEjercicio = () => {
    setCurrentJugadaId(null);
    setTitulo('Nuevo Ejercicio Táctico');
    setNotasEntrenador('');
    setFrames([
      {
        step: 1,
        elementos: [
          { id: 'ea_1', tipo: 'jugador_a', dorsal: 1, x: 50, y: 35 },
          { id: 'balon_1', tipo: 'balon', x: 50, y: 45 },
          { id: 'cono_1', tipo: 'cono', x: 30, y: 50 },
          { id: 'cono_2', tipo: 'cono', x: 70, y: 50 },
        ],
        trazos: [],
      },
    ]);
    setCurrentStepIndex(0);
    showFeedback('Pizarra táctica restablecida', 'cyan');
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-32">
      <TopAppBar
        subtitle="Laboratorio Táctico y Ejercicios • Animaciones Keyframes"
        onRefresh={() => {
          cargarListaGuardadas();
          if (onRefreshGlobal) onRefreshGlobal();
        }}
        isSyncing={cargandoLista || guardando || isSyncingGlobal}
        syncStatus={syncStatus}
      />

      {feedback && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full tactical-glass border border-primary-container/50 shadow-xl flex items-center gap-2 max-w-[90vw] animate-in fade-in duration-200">
          <span
            className={`w-2 h-2 rounded-full ${
              feedback.tone === 'coral'
                ? 'bg-secondary'
                : feedback.tone === 'emerald'
                ? 'bg-tertiary'
                : 'bg-primary'
            }`}
          />
          <span className="font-label-md text-label-md text-on-surface whitespace-nowrap">
            {feedback.msg}
          </span>
        </div>
      )}

      <main className="w-full max-w-4xl mx-auto px-margin-mobile pt-3 space-y-3">
        {/* Panel Superior: Título, Categoría y Tipo de Cancha */}
        <div className="p-3.5 rounded-2xl tactical-glass border border-outline-variant/30 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                Nombre del Ejercicio / Jugada Táctica
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ej. Rondo 4v4 + 2 Comodines"
                className="w-full h-9 px-3 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface font-title-sm text-title-sm font-bold focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-on-surface-variant mb-1">
                Categoría
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full h-9 px-2 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface text-xs font-semibold focus:outline-none focus:border-primary"
              >
                {CATEGORIAS_EJERCICIO.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Selector de Tipo de Cancha */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-outline-variant/20">
            <div className="flex items-center gap-1.5 bg-surface-container p-1 rounded-xl border border-outline-variant/30">
              <button
                type="button"
                onClick={() => setCanchaTipo('completa')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  canchaTipo === 'completa'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Cancha Completa
              </button>
              <button
                type="button"
                onClick={() => setCanchaTipo('media')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  canchaTipo === 'media'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Media Cancha
              </button>
              <button
                type="button"
                onClick={() => setCanchaTipo('reducido')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  canchaTipo === 'reducido'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Espacio Reducido
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleGuardarEnSupabase}
                disabled={guardando}
                className="h-8 px-3 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center gap-1 shadow-md hover:brightness-110 active:scale-95 transition-all disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {guardando ? 'sync' : 'save'}
                </span>
                {currentJugadaId ? 'Actualizar' : 'Guardar'}
              </button>

              <button
                type="button"
                onClick={() => setModalGuardadas(true)}
                className="h-8 px-2.5 rounded-xl bg-surface-container-high border border-outline-variant/40 text-on-surface text-xs font-semibold flex items-center gap-1 hover:bg-surface-container-highest transition-colors"
              >
                <span className="material-symbols-outlined text-[16px] text-tertiary">
                  folder_open
                </span>
                Cargar ({jugadasGuardadas.length})
              </button>

              <button
                type="button"
                onClick={handleNuevoEjercicio}
                className="h-8 px-2 rounded-xl text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-xs flex items-center gap-1"
                title="Nuevo ejercicio en blanco"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
              </button>
            </div>
          </div>
        </div>

        {/* Barra de Utilería y Herramientas Tácticas */}
        <div className="p-2.5 rounded-2xl tactical-glass border border-outline-variant/30 flex flex-wrap items-center justify-between gap-2">
          {/* Fichas de Jugadores y Utilería */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider pr-1">
              Fichas:
            </span>

            {/* Equipo A */}
            <button
              type="button"
              onClick={() => agregarElemento('jugador_a')}
              className="px-2 py-1 rounded-lg bg-[#4DD8E8]/20 border border-[#4DD8E8]/50 text-[#4DD8E8] hover:bg-[#4DD8E8]/30 text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform shrink-0"
              title="Agregar Jugador Equipo A (Cian)"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#4DD8E8] text-black font-mono font-bold text-[9px] flex items-center justify-center">
                A
              </span>
              + Eq A
            </button>

            {/* Equipo B */}
            <button
              type="button"
              onClick={() => agregarElemento('jugador_b')}
              className="px-2 py-1 rounded-lg bg-[#FF7043]/20 border border-[#FF7043]/50 text-[#FF7043] hover:bg-[#FF7043]/30 text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform shrink-0"
              title="Agregar Jugador Equipo B (Coral)"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#FF7043] text-white font-mono font-bold text-[9px] flex items-center justify-center">
                B
              </span>
              + Eq B
            </button>

            {/* Comodín */}
            <button
              type="button"
              onClick={() => agregarElemento('comodin')}
              className="px-2 py-1 rounded-lg bg-[#FACC15]/20 border border-[#FACC15]/50 text-[#FACC15] hover:bg-[#FACC15]/30 text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform shrink-0"
              title="Agregar Comodín (Amarillo)"
            >
              <span className="w-3.5 h-3.5 rounded-full bg-[#FACC15] text-black font-mono font-bold text-[9px] flex items-center justify-center">
                C
              </span>
              + Comodín
            </button>

            {/* Balón */}
            <button
              type="button"
              onClick={() => agregarElemento('balon')}
              className="p-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high text-xs active:scale-95 transition-transform shrink-0"
              title="Agregar Balón"
            >
              ⚽
            </button>

            {/* Cono */}
            <button
              type="button"
              onClick={() => agregarElemento('cono')}
              className="p-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high text-xs active:scale-95 transition-transform shrink-0"
              title="Agregar Cono"
            >
              📐 Cono
            </button>

            {/* Plato */}
            <button
              type="button"
              onClick={() => agregarElemento('plato')}
              className="p-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high text-xs active:scale-95 transition-transform shrink-0"
              title="Agregar Plato/Seta"
            >
              🟡 Plato
            </button>

            {/* Estaca */}
            <button
              type="button"
              onClick={() => agregarElemento('estaca')}
              className="p-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high text-xs active:scale-95 transition-transform shrink-0"
              title="Agregar Pica / Estaca de agilidad"
            >
              📍 Estaca
            </button>

            {/* Valla */}
            <button
              type="button"
              onClick={() => agregarElemento('valla')}
              className="p-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high text-xs active:scale-95 transition-transform shrink-0"
              title="Agregar Mini-Valla"
            >
              ⛩️ Valla
            </button>

            {/* Escalera */}
            <button
              type="button"
              onClick={() => agregarElemento('escalera')}
              className="p-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high text-xs active:scale-95 transition-transform shrink-0"
              title="Agregar Escalera de coordinación"
            >
              🪜 Escalera
            </button>

            {/* Maniquí */}
            <button
              type="button"
              onClick={() => agregarElemento('maniqui')}
              className="p-1.5 rounded-lg bg-surface-container border border-outline-variant/40 hover:bg-surface-container-high text-xs active:scale-95 transition-transform shrink-0"
              title="Agregar Maniquí de entrenamiento"
            >
              👤 Maniquí
            </button>

            {/* Eliminar seleccionado */}
            {selectedElementId && (
              <button
                type="button"
                onClick={eliminarElementoSeleccionado}
                className="px-2 py-1 rounded-lg bg-secondary/20 border border-secondary/40 text-secondary hover:bg-secondary/30 text-xs font-bold flex items-center gap-1 active:scale-95 transition-transform shrink-0"
                title="Eliminar ficha seleccionada"
              >
                <span className="material-symbols-outlined text-[14px]">delete</span>
                Quitar
              </button>
            )}
          </div>

          {/* Selector de Modo: Mover vs Dibujar Lápiz */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-surface-container p-1 rounded-xl border border-outline-variant/30">
              <button
                type="button"
                onClick={() => setModoInteraccion('mover')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  modoInteraccion === 'mover'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">touch_app</span>
                Mover
              </button>
              <button
                type="button"
                onClick={() => setModoInteraccion('dibujar')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  modoInteraccion === 'dibujar'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">draw</span>
                Dibujar
              </button>
            </div>

            {/* Opciones de trazo si está en modo dibujar */}
            {modoInteraccion === 'dibujar' && (
              <div className="flex items-center gap-1.5 bg-surface-container-high p-1 rounded-xl border border-outline-variant/40 animate-in fade-in">
                {/* Tipo de trazo */}
                <button
                  type="button"
                  onClick={() => setTipoTrazo('continua')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    tipoTrazo === 'continua'
                      ? 'bg-surface-container-highest text-primary'
                      : 'text-on-surface-variant'
                  }`}
                  title="Flecha continua (Movimiento de jugador)"
                >
                  ➔ Desplazamiento
                </button>
                <button
                  type="button"
                  onClick={() => setTipoTrazo('punteada')}
                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                    tipoTrazo === 'punteada'
                      ? 'bg-surface-container-highest text-primary'
                      : 'text-on-surface-variant'
                  }`}
                  title="Flecha punteada (Pase de balón)"
                >
                  ⇢ Pase
                </button>

                {/* Colores */}
                <div className="flex items-center gap-1 px-1">
                  {COLORES_TRAZO.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColorTrazo(c.id)}
                      className={`w-4 h-4 rounded-full ${c.bg} ${
                        colorTrazo === c.id ? 'ring-2 ring-white scale-110' : 'opacity-70'
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>

                {/* Acciones de trazo */}
                <button
                  type="button"
                  onClick={handleDeshacerTrazo}
                  className="p-1 rounded text-on-surface-variant hover:text-on-surface"
                  title="Deshacer último trazo"
                >
                  <span className="material-symbols-outlined text-[16px]">undo</span>
                </button>
                <button
                  type="button"
                  onClick={handleBorrarTrazos}
                  className="p-1 rounded text-on-surface-variant hover:text-secondary"
                  title="Borrar todos los trazos"
                >
                  <span className="material-symbols-outlined text-[16px]">clear_all</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Cancha Táctica Interactiva */}
        <div className="w-full flex justify-center">
          <div
            ref={pitchContainerRef}
            onPointerDown={handlePointerDownCancha}
            onPointerMove={handlePointerMoveCancha}
            onPointerUp={handlePointerUpCancha}
            className={`relative w-full rounded-3xl overflow-hidden shadow-2xl select-none touch-none border-2 border-[#1c5434] bg-[#0c2a1a] ${
              canchaTipo === 'media'
                ? 'aspect-[10/8] max-h-[520px]'
                : canchaTipo === 'reducido'
                ? 'aspect-square max-h-[540px]'
                : 'aspect-[2/3] max-h-[620px]'
            }`}
            style={{ touchAction: 'none' }}
          >
            {/* Capa de césped táctico */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#113a24] via-[#0d2f1d] to-[#0a2617] opacity-95 pointer-events-none" />
            <div
              className="absolute inset-0 pointer-events-none opacity-20"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to bottom, transparent, transparent 35px, rgba(255,255,255,0.06) 35px, rgba(255,255,255,0.06) 70px)',
              }}
            />

            {/* SVG Marcado de Cancha */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none stroke-white/40"
              strokeWidth="2"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              {/* Definición de cabezas de flecha para trazos */}
              <defs>
                {COLORES_TRAZO.map((c) => (
                  <marker
                    key={c.id}
                    id={`arrow-${c.id.replace('#', '')}`}
                    viewBox="0 0 10 10"
                    refX="6"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 1 L 10 5 L 0 9 z" fill={c.id} />
                  </marker>
                ))}
              </defs>

              {/* Cancha Completa */}
              {canchaTipo === 'completa' && (
                <>
                  <rect x="5" y="5" width="90" height="90" rx="2" />
                  <line x1="5" y1="50" x2="95" y2="50" />
                  <circle cx="50" cy="50" r="12" />
                  <circle cx="50" cy="50" r="1" fill="rgba(255,255,255,0.7)" />
                  {/* Área norte */}
                  <rect x="25" y="5" width="50" height="18" />
                  <rect x="36" y="5" width="28" height="7" />
                  <circle cx="50" cy="14" r="1" fill="rgba(255,255,255,0.7)" />
                  {/* Área sur */}
                  <rect x="25" y="77" width="50" height="18" />
                  <rect x="36" y="88" width="28" height="7" />
                  <circle cx="50" cy="86" r="1" fill="rgba(255,255,255,0.7)" />
                </>
              )}

              {/* Media Cancha */}
              {canchaTipo === 'media' && (
                <>
                  <rect x="5" y="5" width="90" height="90" rx="2" />
                  {/* Medio campo arriba */}
                  <line x1="5" y1="12" x2="95" y2="12" />
                  <path d="M 38 12 A 12 12 0 0 0 62 12" />
                  {/* Área grande */}
                  <rect x="20" y="60" width="60" height="35" />
                  <rect x="34" y="82" width="32" height="13" />
                  <circle cx="50" cy="74" r="1" fill="rgba(255,255,255,0.7)" />
                  <path d="M 38 60 A 12 12 0 0 1 62 60" />
                  {/* Portería */}
                  <rect x="36" y="95" width="28" height="4" stroke="#4dd8e8" fill="rgba(77,216,232,0.2)" />
                </>
              )}

              {/* Espacio Reducido / Rondo */}
              {canchaTipo === 'reducido' && (
                <>
                  <rect x="8" y="8" width="84" height="84" rx="4" strokeWidth="2.5" />
                  {/* Cuadrantes de rondo */}
                  <line x1="8" y1="50" x2="92" y2="50" strokeDasharray="3,3" strokeOpacity="0.5" />
                  <line x1="50" y1="8" x2="50" y2="92" strokeDasharray="3,3" strokeOpacity="0.5" />
                  <circle cx="50" cy="50" r="14" strokeDasharray="4,4" strokeOpacity="0.6" />
                  {/* Conos en esquinas de rondo */}
                  <rect x="18" y="18" width="64" height="64" strokeOpacity="0.3" strokeDasharray="2,2" />
                </>
              )}

              {/* Render de Trazos Dibujados en el Frame Actual */}
              {(currentFrame.trazos || []).map((tr) => {
                if (!tr.puntos || tr.puntos.length < 2) return null;
                const pathD = tr.puntos.reduce(
                  (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
                  ''
                );
                const markerId = `arrow-${(tr.color || '#4DD8E8').replace('#', '')}`;

                return (
                  <path
                    key={tr.id}
                    d={pathD}
                    stroke={tr.color || '#4DD8E8'}
                    strokeWidth="3"
                    strokeDasharray={tr.tipo === 'punteada' ? '5,5' : 'none'}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    markerEnd={`url(#${markerId})`}
                  />
                );
              })}

              {/* Trazo en curso mientras el usuario arrastra el lápiz */}
              {trazoEnCurso && trazoEnCurso.puntos.length > 1 && (
                <path
                  d={trazoEnCurso.puntos.reduce(
                    (acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`,
                    ''
                  )}
                  stroke={trazoEnCurso.color || '#4DD8E8'}
                  strokeWidth="3.5"
                  strokeDasharray={trazoEnCurso.tipo === 'punteada' ? '5,5' : 'none'}
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>

            {/* Fichas y Utilería en la Cancha */}
            {elementosVisuales.map((el) => {
              const isSelected = selectedElementId === el.id;

              return (
                <div
                  key={el.id}
                  onPointerDown={(e) => handlePointerDownElemento(e, el.id)}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 select-none flex items-center justify-center transition-transform ${
                    modoInteraccion === 'mover'
                      ? 'cursor-grab active:cursor-grabbing hover:scale-110 active:scale-125'
                      : 'pointer-events-none'
                  }`}
                  style={{
                    left: `${el.x}%`,
                    top: `${el.y}%`,
                    touchAction: 'none',
                  }}
                >
                  {/* Jugador Equipo A (Cian) */}
                  {el.tipo === 'jugador_a' && (
                    <div
                      className={`w-9 h-9 rounded-full bg-[#4DD8E8] text-black font-extrabold text-xs flex items-center justify-center shadow-lg border-2 ${
                        isSelected ? 'ring-4 ring-white border-black scale-110' : 'border-white'
                      }`}
                    >
                      {el.dorsal || 'A'}
                    </div>
                  )}

                  {/* Jugador Equipo B (Coral) */}
                  {el.tipo === 'jugador_b' && (
                    <div
                      className={`w-9 h-9 rounded-full bg-[#FF7043] text-white font-extrabold text-xs flex items-center justify-center shadow-lg border-2 ${
                        isSelected ? 'ring-4 ring-white border-black scale-110' : 'border-white'
                      }`}
                    >
                      {el.dorsal || 'B'}
                    </div>
                  )}

                  {/* Comodín (Amarillo) */}
                  {el.tipo === 'comodin' && (
                    <div
                      className={`w-9 h-9 rounded-full bg-[#FACC15] text-black font-extrabold text-xs flex items-center justify-center shadow-lg border-2 ${
                        isSelected ? 'ring-4 ring-white border-black scale-110' : 'border-black'
                      }`}
                    >
                      {el.dorsal || 'C'}
                    </div>
                  )}

                  {/* Balón */}
                  {el.tipo === 'balon' && (
                    <div
                      className={`w-6 h-6 rounded-full bg-white shadow-md flex items-center justify-center border border-black text-[12px] leading-none ${
                        isSelected ? 'ring-2 ring-primary scale-125' : ''
                      }`}
                    >
                      ⚽
                    </div>
                  )}

                  {/* Cono de Entrenamiento */}
                  {el.tipo === 'cono' && (
                    <div
                      className={`w-7 h-7 flex items-center justify-center drop-shadow-md ${
                        isSelected ? 'ring-2 ring-primary rounded' : ''
                      }`}
                    >
                      <svg viewBox="0 0 40 40" className="w-full h-full">
                        <polygon points="20,5 34,35 6,35" fill="#FB923C" stroke="#C2410C" strokeWidth="2" />
                        <polygon points="20,15 27,30 13,30" fill="#FFFFFF" opacity="0.8" />
                      </svg>
                    </div>
                  )}

                  {/* Plato / Seta */}
                  {el.tipo === 'plato' && (
                    <div
                      className={`w-6 h-6 flex items-center justify-center drop-shadow-sm ${
                        isSelected ? 'ring-2 ring-primary rounded-full' : ''
                      }`}
                    >
                      <svg viewBox="0 0 40 40" className="w-full h-full">
                        <ellipse cx="20" cy="22" rx="16" ry="9" fill="#FACC15" stroke="#CA8A04" strokeWidth="2" />
                        <ellipse cx="20" cy="20" rx="6" ry="3" fill="#A16207" />
                      </svg>
                    </div>
                  )}

                  {/* Estaca / Pica */}
                  {el.tipo === 'estaca' && (
                    <div
                      className={`w-5 h-8 flex items-center justify-center drop-shadow-md ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <svg viewBox="0 0 20 40" className="w-full h-full">
                        <line x1="10" y1="4" x2="10" y2="36" stroke="#EF4444" strokeWidth="4" strokeLinecap="round" />
                        <circle cx="10" cy="5" r="3" fill="#B91C1C" />
                      </svg>
                    </div>
                  )}

                  {/* Mini-Valla */}
                  {el.tipo === 'valla' && (
                    <div
                      className={`w-9 h-6 flex items-center justify-center drop-shadow-sm ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <svg viewBox="0 0 40 25" className="w-full h-full">
                        <rect x="5" y="4" width="30" height="4" fill="#38BDF8" rx="2" />
                        <line x1="8" y1="8" x2="8" y2="22" stroke="#0284C7" strokeWidth="3" />
                        <line x1="32" y1="8" x2="32" y2="22" stroke="#0284C7" strokeWidth="3" />
                      </svg>
                    </div>
                  )}

                  {/* Escalera de Agilidad */}
                  {el.tipo === 'escalera' && (
                    <div
                      className={`w-8 h-12 flex items-center justify-center drop-shadow-sm ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <svg viewBox="0 0 30 50" className="w-full h-full">
                        <line x1="6" y1="4" x2="6" y2="46" stroke="#E2E8F0" strokeWidth="2.5" />
                        <line x1="24" y1="4" x2="24" y2="46" stroke="#E2E8F0" strokeWidth="2.5" />
                        <line x1="6" y1="12" x2="24" y2="12" stroke="#F59E0B" strokeWidth="2.5" />
                        <line x1="6" y1="22" x2="24" y2="22" stroke="#F59E0B" strokeWidth="2.5" />
                        <line x1="6" y1="32" x2="24" y2="32" stroke="#F59E0B" strokeWidth="2.5" />
                        <line x1="6" y1="42" x2="24" y2="42" stroke="#F59E0B" strokeWidth="2.5" />
                      </svg>
                    </div>
                  )}

                  {/* Maniquí */}
                  {el.tipo === 'maniqui' && (
                    <div
                      className={`w-8 h-10 flex items-center justify-center drop-shadow-md ${
                        isSelected ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <svg viewBox="0 0 35 45" className="w-full h-full">
                        <circle cx="17.5" cy="8" r="5" fill="#94A3B8" />
                        <rect x="7" y="15" width="21" height="18" rx="4" fill="#64748B" />
                        <line x1="17.5" y1="33" x2="17.5" y2="43" stroke="#475569" strokeWidth="3" />
                      </svg>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Barra de Línea de Tiempo y Fotogramas (Keyframes) */}
        <div className="p-3.5 rounded-2xl tactical-glass border border-outline-variant/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Reproducción y Velocidad */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isPlaying) {
                    setIsPlaying(false);
                  } else {
                    if (frames.length <= 1) {
                      showFeedback('Agrega al menos un segundo paso para reproducir la animación', 'coral');
                      return;
                    }
                    setIsPlaying(true);
                  }
                }}
                className={`h-9 px-4 rounded-xl font-label-md text-label-md font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 ${
                  isPlaying
                    ? 'bg-secondary text-on-secondary'
                    : 'bg-primary text-on-primary hover:brightness-110'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {isPlaying ? 'pause' : 'play_arrow'}
                </span>
                {isPlaying ? 'Pausar' : 'Play Animación'}
              </button>

              {/* Selector de Velocidad */}
              <div className="flex items-center bg-surface-container p-0.5 rounded-xl border border-outline-variant/30 text-xs font-bold">
                {[0.5, 1, 2].map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setPlaybackSpeed(spd)}
                    className={`px-2 py-1 rounded-lg transition-colors ${
                      playbackSpeed === spd
                        ? 'bg-surface-container-highest text-primary'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Exportar Grabación */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={exportarAnimacionWebM}
                disabled={isRecording}
                className="h-9 px-3 rounded-xl bg-surface-container-high border border-outline-variant/40 text-on-surface hover:text-primary font-label-sm text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
                title="Generar video WebM con la animación de los fotogramas"
              >
                <span className={`material-symbols-outlined text-[18px] text-primary ${isRecording ? 'animate-spin' : ''}`}>
                  {isRecording ? 'sync' : 'videocam'}
                </span>
                {isRecording ? 'Grabando...' : 'Grabar Video WebM'}
              </button>

              <button
                type="button"
                onClick={exportarArchivoJSON}
                className="h-9 px-2.5 rounded-xl bg-surface-container-high border border-outline-variant/40 text-on-surface hover:text-tertiary text-xs font-semibold flex items-center gap-1"
                title="Exportar archivo táctico en formato JSON"
              >
                <span className="material-symbols-outlined text-[16px]">file_download</span>
                JSON
              </button>
            </div>
          </div>

          {/* Carrusel de Pasos (Keyframes) */}
          <div className="space-y-1.5 pt-1 border-t border-outline-variant/20">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-primary">timeline</span>
                Línea de Tiempo del Ejercicio ({frames.length} pasos)
              </span>
              <span className="text-[11px] text-on-surface-variant">
                Paso activo: {currentStepIndex + 1} de {frames.length}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
              {frames.map((frame, idx) => {
                const isCurrent = currentStepIndex === idx;
                return (
                  <div
                    key={frame.step || idx}
                    className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl border transition-all ${
                      isCurrent
                        ? 'bg-primary/20 border-primary text-primary font-bold shadow-md'
                        : 'bg-surface-container border-outline-variant/30 text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsPlaying(false);
                        setCurrentStepIndex(idx);
                      }}
                      className="text-xs"
                    >
                      Paso {idx + 1}
                    </button>

                    {frames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => eliminarPaso(idx)}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-on-surface-variant hover:text-secondary text-[12px] ml-1"
                        title="Eliminar este paso"
                      >
                        ×
                      </button>
                    )}
                  </div>
                );
              })}

              {/* Botón para clonar y agregar siguiente paso */}
              <button
                type="button"
                onClick={agregarPaso}
                className="shrink-0 px-3 py-1.5 rounded-xl bg-surface-container-high border border-dashed border-primary/50 text-primary hover:bg-surface-container-highest text-xs font-bold flex items-center gap-1 active:scale-95 transition-all"
                title="Clonar posiciones actuales y crear nuevo paso en la animación"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                + Agregar Paso
              </button>
            </div>
          </div>
        </div>

        {/* Instrucciones y Notas para el Entrenador */}
        <div className="p-3.5 rounded-2xl tactical-glass border border-outline-variant/30 space-y-1.5">
          <label className="block text-xs font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px] text-primary">description</span>
            Instrucciones Metodológicas y Consignas del Ejercicio
          </label>
          <textarea
            rows="2"
            value={notasEntrenador}
            onChange={(e) => setNotasEntrenador(e.target.value)}
            placeholder="Ej. Dimensiones: 20x20m. Regla: Máximo 2 toques por jugador. Tras 6 pases seguidos, buscar pase filtrado con el comodín..."
            className="w-full p-2.5 rounded-xl bg-surface-container border border-outline-variant/40 text-on-surface text-xs focus:outline-none focus:border-primary resize-none"
          />
        </div>
      </main>

      {/* Modal de Ejercicios Guardados en Supabase */}
      {modalGuardadas && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-surface-container-high border border-outline-variant/50 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-3.5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">
                  folder_open
                </span>
                <h3 className="font-title-md text-title-md font-bold text-on-surface">
                  Ejercicios Guardados (Supabase)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalGuardadas(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {jugadasGuardadas.length === 0 ? (
              <div className="py-8 text-center text-on-surface-variant text-xs">
                No hay jugadas ni ejercicios guardados aún en Supabase. Pulsa "Guardar" para registrar el primero.
              </div>
            ) : (
              <div className="space-y-2">
                {jugadasGuardadas.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleCargarJugada(item)}
                    className="p-3 rounded-xl bg-surface-container border border-outline-variant/40 hover:border-primary/50 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="min-w-0">
                      <h4 className="font-title-sm text-title-sm font-bold text-on-surface group-hover:text-primary transition-colors truncate">
                        {item.titulo}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant mt-0.5">
                        {item.categoria} • Cancha {item.cancha_tipo} • {item.frames?.length || 1} pasos
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleBorrarJugada(item.id, e)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-secondary transition-colors shrink-0"
                      title="Eliminar de Supabase"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
