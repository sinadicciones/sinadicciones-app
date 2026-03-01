import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authenticatedFetch, getBackendURL } from '../../utils/api';
import { Svg, Polygon, Circle, Line as SvgLine, Text as SvgText } from 'react-native-svg';
import BottomNavigation from '../../components/BottomNavigation';

const BACKEND_URL = getBackendURL();
const { width } = Dimensions.get('window');

const AREAS = [
  { key: 'health', label: 'Salud Física', icon: 'fitness', color: '#10B981' },
  { key: 'relationships', label: 'Relaciones', icon: 'people', color: '#3B82F6' },
  { key: 'work', label: 'Trabajo/Carrera', icon: 'briefcase', color: '#8B5CF6' },
  { key: 'personal', label: 'Desarrollo Personal', icon: 'school', color: '#EC4899' },
  { key: 'spiritual', label: 'Espiritualidad', icon: 'sparkles', color: '#F59E0B' },
  { key: 'finances', label: 'Finanzas', icon: 'cash', color: '#EF4444' },
];

// Definiciones completas de tipos de propósito
const PURPOSE_TYPES: { [key: string]: { emoji: string; description: string; strengths: string[]; tips: string[]; affirmation: string } } = {
  // === TIPOS ORIENTADOS AL SERVICIO ===
  'Cuidador': {
    emoji: '💝',
    description: 'Tu propósito se centra en el servicio y cuidado de otros. Encuentras significado profundo en ayudar, proteger y apoyar a quienes te rodean. Tu empatía y compasión son tus mayores fortalezas, y tu presencia reconforta a los demás.',
    strengths: ['Empatía profunda', 'Capacidad de escucha', 'Generosidad natural', 'Conexión emocional'],
    tips: [
      'Recuerda cuidarte a ti mismo primero para poder cuidar a otros',
      'Establece límites saludables para evitar el agotamiento emocional',
      'Tu recuperación te permite ser un mejor apoyo para otros',
    ],
    affirmation: 'Mi capacidad de amar y cuidar es un regalo que comparto desde mi sobriedad.',
  },
  'Sanador': {
    emoji: '🩺',
    description: 'Tu propósito es aliviar el sufrimiento y promover la sanación en otros. Tienes un don natural para detectar el dolor ajeno y una vocación profunda por restaurar el bienestar físico, emocional o espiritual.',
    strengths: ['Intuición sanadora', 'Presencia calmante', 'Conocimiento terapéutico', 'Paciencia infinita'],
    tips: [
      'Tu propia sanación te da autoridad para ayudar a otros',
      'Practica técnicas de autocuidado diariamente',
      'Tu experiencia con el dolor te hace un sanador más compasivo',
    ],
    affirmation: 'Mis heridas sanadas son mi mayor herramienta de sanación.',
  },
  'Servidor': {
    emoji: '🙏',
    description: 'Tu propósito está en el servicio desinteresado a la comunidad. Encuentras paz y significado al contribuir al bienestar colectivo, sin esperar reconocimiento. Tu humildad es tu mayor virtud.',
    strengths: ['Humildad genuina', 'Dedicación constante', 'Espíritu de servicio', 'Trabajo en equipo'],
    tips: [
      'El servicio a otros fortalece tu propia recuperación',
      'Busca oportunidades de voluntariado que te llenen',
      'Recuerda que servir también incluye dejarte ayudar',
    ],
    affirmation: 'En el servicio a otros encuentro mi propio camino de sanación.',
  },
  'Protector': {
    emoji: '🛡️',
    description: 'Tu propósito es defender y proteger a quienes amas y a los más vulnerables. Tienes un instinto natural de justicia y una valentía que te impulsa a dar la cara por otros.',
    strengths: ['Instinto protector', 'Valentía inquebrantable', 'Sentido de justicia', 'Lealtad profunda'],
    tips: [
      'Protégete a ti mismo primero manteniendo tu sobriedad',
      'Canaliza tu energía protectora de forma constructiva',
      'Tu fortaleza inspira seguridad en quienes te rodean',
    ],
    affirmation: 'Mi sobriedad me hace un protector más fuerte y presente.',
  },

  // === TIPOS ORIENTADOS A LA CREATIVIDAD ===
  'Creador': {
    emoji: '🎨',
    description: 'Tu propósito está en la expresión creativa y la innovación. Encuentras significado al crear, diseñar y dar vida a nuevas ideas. Tu imaginación y originalidad transforman el mundo a tu alrededor.',
    strengths: ['Pensamiento innovador', 'Expresión artística', 'Visión única', 'Resolución creativa'],
    tips: [
      'Usa la creatividad como herramienta de sanación emocional',
      'Documenta tus ideas y proyectos creativos',
      'La sobriedad libera tu verdadero potencial creativo',
    ],
    affirmation: 'Mi creatividad florece en claridad mental.',
  },
  'Artista': {
    emoji: '🎭',
    description: 'Tu propósito es expresar la belleza y las emociones profundas a través del arte. Tienes una sensibilidad especial que te permite capturar y transmitir experiencias humanas de manera única.',
    strengths: ['Sensibilidad estética', 'Expresión emocional', 'Originalidad', 'Percepción profunda'],
    tips: [
      'El arte puede ser tu terapia y tu refugio',
      'Expresa tus emociones difíciles a través de tu arte',
      'Tu sensibilidad es un don, no una debilidad',
    ],
    affirmation: 'Mi arte es más auténtico cuando creo desde mi verdadero yo.',
  },
  'Constructor': {
    emoji: '🏗️',
    description: 'Tu propósito es edificar cosas duraderas: proyectos, negocios, relaciones, legados. Tienes la paciencia y visión para crear estructuras que perduren en el tiempo.',
    strengths: ['Visión a largo plazo', 'Persistencia', 'Planificación', 'Creación de legado'],
    tips: [
      'Construye tu recuperación día a día, ladrillo a ladrillo',
      'Tu capacidad de construir ahora se enfoca en cosas valiosas',
      'Cada día limpio es un cimiento más de tu nueva vida',
    ],
    affirmation: 'Construyo mi nueva vida con cada decisión consciente.',
  },
  'Innovador': {
    emoji: '💡',
    description: 'Tu propósito es encontrar nuevas soluciones y mejores formas de hacer las cosas. Ves posibilidades donde otros ven obstáculos y tu mente siempre busca optimizar y revolucionar.',
    strengths: ['Pensamiento disruptivo', 'Resolución de problemas', 'Visión futurista', 'Adaptabilidad'],
    tips: [
      'Aplica tu capacidad innovadora a tu recuperación',
      'Busca nuevas estrategias cuando las antiguas no funcionan',
      'Tu mente creativa es un recurso valioso en sobriedad',
    ],
    affirmation: 'Mi mente innovadora encuentra nuevos caminos hacia el bienestar.',
  },

  // === TIPOS ORIENTADOS AL LIDERAZGO ===
  'Líder': {
    emoji: '👑',
    description: 'Tu propósito es guiar, inspirar y empoderar a otros. Tienes una capacidad natural para tomar decisiones, motivar al cambio positivo y llevar a grupos hacia objetivos comunes.',
    strengths: ['Visión clara', 'Capacidad de influencia', 'Toma de decisiones', 'Inspirar a otros'],
    tips: [
      'Lidera con el ejemplo en tu recuperación',
      'Usa tu influencia para crear impacto positivo',
      'Tu historia puede inspirar a otros en su camino',
    ],
    affirmation: 'Lidero mi vida con propósito y claridad.',
  },
  'Maestro': {
    emoji: '📚',
    description: 'Tu propósito es educar, guiar y transmitir conocimiento. Tienes el don de hacer que otros comprendan y crezcan, transformando información en sabiduría práctica.',
    strengths: ['Claridad al explicar', 'Paciencia pedagógica', 'Conocimiento profundo', 'Inspirar aprendizaje'],
    tips: [
      'Enseña lo que has aprendido en tu recuperación',
      'Tu experiencia es una lección valiosa para otros',
      'Aprende constantemente para tener más que compartir',
    ],
    affirmation: 'Mi experiencia se convierte en sabiduría que comparto.',
  },
  'Mentor': {
    emoji: '🌟',
    description: 'Tu propósito es acompañar el crecimiento individual de otros. No solo enseñas, sino que guías, apoyas y crees en el potencial de cada persona que acompañas.',
    strengths: ['Guía personalizada', 'Fe en otros', 'Escucha activa', 'Desarrollo de potencial'],
    tips: [
      'Considera ser padrino/madrina en un programa de recuperación',
      'Tu presencia constante puede cambiar vidas',
      'Acompañar a otros fortalece tu propio camino',
    ],
    affirmation: 'Al guiar a otros, también me guío a mí mismo.',
  },
  'Motivador': {
    emoji: '🔥',
    description: 'Tu propósito es encender la chispa de la acción en otros. Tienes una energía contagiosa que impulsa a las personas a superar sus límites y creer en sí mismas.',
    strengths: ['Energía contagiosa', 'Optimismo', 'Comunicación poderosa', 'Inspiración'],
    tips: [
      'Tu energía positiva es un regalo para quienes luchan',
      'Mantén tu propia motivación cuidando tu bienestar',
      'Comparte tu historia para inspirar a otros',
    ],
    affirmation: 'Mi energía positiva ilumina mi camino y el de otros.',
  },

  // === TIPOS ORIENTADOS AL CONOCIMIENTO ===
  'Sabio': {
    emoji: '🦉',
    description: 'Tu propósito es buscar y compartir conocimiento profundo. Valoras la verdad, el aprendizaje continuo y la comprensión de los misterios de la vida.',
    strengths: ['Análisis profundo', 'Búsqueda de verdad', 'Reflexión', 'Compartir sabiduría'],
    tips: [
      'Aprende de tu experiencia para ayudar a otros',
      'La reflexión diaria es clave en tu recuperación',
      'Comparte tu conocimiento con quienes lo necesitan',
    ],
    affirmation: 'La sabiduría de mi experiencia guía mis pasos.',
  },
  'Investigador': {
    emoji: '🔬',
    description: 'Tu propósito es comprender profundamente cómo funcionan las cosas. Tu mente analítica busca respuestas, patrones y verdades ocultas en todo lo que te rodea.',
    strengths: ['Mente analítica', 'Atención al detalle', 'Pensamiento crítico', 'Curiosidad científica'],
    tips: [
      'Investiga sobre la ciencia de la adicción y recuperación',
      'Analiza tus patrones para entender tus triggers',
      'Tu capacidad analítica es una herramienta de autoconocimiento',
    ],
    affirmation: 'Mi mente analítica me ayuda a entenderme mejor.',
  },
  'Filósofo': {
    emoji: '🤔',
    description: 'Tu propósito es reflexionar sobre las grandes preguntas de la vida. Buscas sentido, propósito y comprensión del lugar del ser humano en el universo.',
    strengths: ['Pensamiento profundo', 'Cuestionamiento', 'Búsqueda de sentido', 'Perspectiva amplia'],
    tips: [
      'Reflexiona sobre el significado de tu recuperación',
      'Las preguntas difíciles pueden llevar a respuestas sanadoras',
      'Tu capacidad de reflexión te da perspectiva en momentos difíciles',
    ],
    affirmation: 'En la reflexión encuentro claridad y propósito.',
  },
  'Visionario': {
    emoji: '🔮',
    description: 'Tu propósito es ver más allá del presente y visualizar futuros posibles. Tienes la capacidad de imaginar lo que podría ser y trabajar para hacerlo realidad.',
    strengths: ['Visión futurista', 'Imaginación', 'Pensamiento estratégico', 'Inspiración de cambio'],
    tips: [
      'Visualiza tu vida en sobriedad a largo plazo',
      'Tus sueños pueden guiar tu recuperación',
      'Comparte tu visión para inspirar a otros',
    ],
    affirmation: 'Visualizo y creo el futuro que deseo.',
  },

  // === TIPOS ORIENTADOS A LA AVENTURA ===
  'Explorador': {
    emoji: '🧭',
    description: 'Tu propósito está en el descubrimiento y la aventura. Buscas nuevas experiencias, lugares, ideas y formas de ver el mundo. La rutina te asfixia y lo nuevo te da vida.',
    strengths: ['Curiosidad infinita', 'Adaptabilidad', 'Apertura mental', 'Valentía ante lo desconocido'],
    tips: [
      'Explora nuevas formas saludables de vivir aventuras',
      'Tu curiosidad te llevará a descubrir tu mejor versión',
      'Cada día en sobriedad es una nueva aventura',
    ],
    affirmation: 'Exploro la vida con ojos nuevos y mente clara.',
  },
  'Aventurero': {
    emoji: '⛰️',
    description: 'Tu propósito es vivir intensamente y buscar experiencias que te hagan sentir vivo. Necesitas desafíos, adrenalina y la emoción de superar tus límites.',
    strengths: ['Valentía', 'Búsqueda de intensidad', 'Superación de límites', 'Vitalidad'],
    tips: [
      'Busca deportes extremos o actividades que te den adrenalina sana',
      'La recuperación es la mayor aventura de tu vida',
      'Canaliza tu necesidad de intensidad de forma positiva',
    ],
    affirmation: 'Encuentro aventura y emoción en una vida plena y sobria.',
  },
  'Nómada': {
    emoji: '🌍',
    description: 'Tu propósito es la libertad y el movimiento. No te atas a un lugar ni a una forma de vida. Encuentras paz en el cambio y el descubrimiento de nuevos horizontes.',
    strengths: ['Libertad interior', 'Desapego sano', 'Adaptabilidad extrema', 'Independencia'],
    tips: [
      'Tu recuperación puede acompañarte a donde vayas',
      'Encuentra comunidades de apoyo en cada lugar',
      'La libertad verdadera viene de la sobriedad',
    ],
    affirmation: 'Soy libre para ir a donde mi corazón sobrio me guíe.',
  },

  // === TIPOS ORIENTADOS A LA FORTALEZA ===
  'Guerrero': {
    emoji: '⚔️',
    description: 'Tu propósito es superar desafíos y proteger lo que valoras. Tienes una fuerza interior extraordinaria, determinación inquebrantable y no te rindes ante la adversidad.',
    strengths: ['Resiliencia', 'Determinación', 'Valentía', 'Disciplina'],
    tips: [
      'Tu fortaleza te ha traído hasta aquí',
      'Canaliza tu energía en batallas que valen la pena',
      'Cada día limpio es una victoria que celebrar',
    ],
    affirmation: 'Soy un guerrero de mi propia recuperación.',
  },
  'Superviviente': {
    emoji: '🦅',
    description: 'Tu propósito nace de haber superado lo imposible. Has sobrevivido tormentas que otros no comprenden, y esa experiencia te da una perspectiva única sobre la vida.',
    strengths: ['Resiliencia extrema', 'Perspectiva de vida', 'Gratitud profunda', 'Fortaleza emocional'],
    tips: [
      'Tu historia de supervivencia puede salvar vidas',
      'Cada día es un regalo que sabes apreciar',
      'Tu capacidad de sobrevivir te hace imparable',
    ],
    affirmation: 'He sobrevivido lo peor; puedo construir lo mejor.',
  },
  'Luchador': {
    emoji: '🥊',
    description: 'Tu propósito es nunca rendirte, sin importar cuántas veces caigas. Tienes un espíritu de lucha que te hace levantarte una y otra vez, más fuerte cada vez.',
    strengths: ['Perseverancia', 'Espíritu indomable', 'Capacidad de levantarse', 'Tenacidad'],
    tips: [
      'Las recaídas no te definen, levantarte sí',
      'Cada caída te enseña algo nuevo',
      'Tu espíritu de lucha es tu mayor activo',
    ],
    affirmation: 'Cada vez que me levanto, me hago más fuerte.',
  },
  'Transformador': {
    emoji: '🦋',
    description: 'Tu propósito es la transformación constante. Crees profundamente en el poder del cambio y en que cualquier persona puede reinventarse y renacer de las cenizas.',
    strengths: ['Capacidad de cambio', 'Reinvención', 'Crecimiento continuo', 'Inspirar transformación'],
    tips: [
      'Tu transformación es prueba de que el cambio es posible',
      'Abraza cada etapa de tu metamorfosis',
      'Tu historia de cambio inspira esperanza en otros',
    ],
    affirmation: 'Me transformo cada día en una mejor versión de mí.',
  },

  // === TIPOS ORIENTADOS A LA CONEXIÓN ===
  'Conector': {
    emoji: '🔗',
    description: 'Tu propósito es unir personas, ideas y recursos. Tienes un don natural para ver cómo las piezas encajan y crear redes de apoyo y colaboración.',
    strengths: ['Networking natural', 'Visión de conjunto', 'Facilitación', 'Crear comunidad'],
    tips: [
      'Conecta a personas en recuperación que puedan apoyarse',
      'Tu red de contactos puede ser tu red de seguridad',
      'Construye puentes, no muros, en tu recuperación',
    ],
    affirmation: 'Conecto con otros para crecer juntos.',
  },
  'Pacificador': {
    emoji: '☮️',
    description: 'Tu propósito es crear armonía y resolver conflictos. Tienes un don para ver todos los lados de una situación y encontrar puntos de encuentro entre personas diferentes.',
    strengths: ['Mediación', 'Empatía múltiple', 'Calma en el conflicto', 'Diplomacia'],
    tips: [
      'Haz las paces contigo mismo primero',
      'Tu capacidad de mediar puede ayudar en grupos de apoyo',
      'La paz interior es el fundamento de la paz exterior',
    ],
    affirmation: 'Cultivo la paz en mi interior y la comparto con el mundo.',
  },
  'Comunicador': {
    emoji: '🗣️',
    description: 'Tu propósito es expresar y conectar a través de las palabras. Tienes el don de articular ideas, emociones y experiencias de manera que otros las comprendan profundamente.',
    strengths: ['Elocuencia', 'Empatía verbal', 'Claridad de expresión', 'Escucha activa'],
    tips: [
      'Comparte tu historia; tus palabras pueden salvar vidas',
      'Practica expresar tus emociones de forma saludable',
      'Tu voz es una herramienta poderosa de recuperación',
    ],
    affirmation: 'Mi voz tiene poder para sanar y conectar.',
  },

  // === TIPOS ORIENTADOS AL EMPRENDIMIENTO ===
  'Emprendedor': {
    emoji: '🚀',
    description: 'Tu propósito es crear valor y construir proyectos desde cero. Ves oportunidades donde otros ven problemas y tienes la energía para convertir ideas en realidad.',
    strengths: ['Iniciativa', 'Tolerancia al riesgo', 'Visión de negocio', 'Determinación'],
    tips: [
      'Emprende tu recuperación con la misma energía',
      'Construye una vida que no necesites escapar',
      'Tu capacidad de crear puede transformar tu futuro',
    ],
    affirmation: 'Emprendo cada día la aventura de vivir plenamente.',
  },
  'Estratega': {
    emoji: '♟️',
    description: 'Tu propósito es planificar y ejecutar con precisión. Ves varios pasos adelante y sabes cómo mover las piezas para alcanzar objetivos complejos.',
    strengths: ['Pensamiento estratégico', 'Planificación', 'Análisis de situaciones', 'Ejecución precisa'],
    tips: [
      'Diseña una estrategia clara para tu recuperación',
      'Anticipa situaciones de riesgo y planifica respuestas',
      'Tu mente estratégica es tu aliada contra la adicción',
    ],
    affirmation: 'Planifico mi bienestar con intención y claridad.',
  },

  // === TIPOS ORIENTADOS A LA ESPIRITUALIDAD ===
  'Místico': {
    emoji: '✨',
    description: 'Tu propósito es conectar con lo trascendente y lo sagrado. Sientes una conexión profunda con dimensiones de la existencia que van más allá de lo material.',
    strengths: ['Conexión espiritual', 'Intuición profunda', 'Sensibilidad energética', 'Fe inquebrantable'],
    tips: [
      'Tu espiritualidad puede ser tu ancla en la recuperación',
      'Practica meditación u oración diariamente',
      'Confía en tu conexión con algo mayor que tú',
    ],
    affirmation: 'Mi conexión espiritual me sostiene en cada paso.',
  },
  'Contemplativo': {
    emoji: '🧘',
    description: 'Tu propósito está en la quietud, la meditación y la presencia. Encuentras significado en el silencio interior y la observación profunda del momento presente.',
    strengths: ['Presencia plena', 'Paz interior', 'Autoconocimiento', 'Serenidad'],
    tips: [
      'La meditación puede ser tu herramienta principal de recuperación',
      'Practica la atención plena en cada momento',
      'En la quietud encontrarás las respuestas que buscas',
    ],
    affirmation: 'En la quietud encuentro mi fuerza y claridad.',
  },

  // === TIPOS ORIENTADOS A LA NATURALEZA ===
  'Guardián de la Tierra': {
    emoji: '🌱',
    description: 'Tu propósito es proteger y cuidar el planeta y todos sus seres. Sientes una conexión profunda con la naturaleza y te duele su destrucción.',
    strengths: ['Conexión con la naturaleza', 'Conciencia ecológica', 'Cuidado del entorno', 'Visión holística'],
    tips: [
      'Pasa tiempo en la naturaleza para tu sanación',
      'Conectar con la tierra te ayuda a conectar contigo',
      'Cuidar el planeta puede dar sentido a tu vida',
    ],
    affirmation: 'Mi conexión con la naturaleza me sana y me da propósito.',
  },

  // === TIPO COMODÍN ===
  'Buscador': {
    emoji: '🔍',
    description: 'Tu propósito está en constante evolución. Eres alguien que busca activamente su lugar en el mundo, probando diferentes caminos hasta encontrar el que resuena con tu esencia.',
    strengths: ['Apertura', 'Flexibilidad', 'Autoexploración', 'Humildad'],
    tips: [
      'Está bien no tener todas las respuestas todavía',
      'Tu búsqueda es parte del viaje, no un defecto',
      'Mantente abierto a descubrir quién eres realmente',
    ],
    affirmation: 'En mi búsqueda constante, me encuentro a mí mismo.',
  },
};

export default function PurposeDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [areaRatings, setAreaRatings] = useState<any>({});
  const [showPurposeModal, setShowPurposeModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  
  // AI Analysis states
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const response = await authenticatedFetch(`${BACKEND_URL}/api/purpose/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setAreaRatings(data.latest_area_ratings || {});
      }
    } catch (error) {
      console.error('Failed to load purpose data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const getPurposeInfo = () => {
    if (!stats?.purpose_type) return null;
    return PURPOSE_TYPES[stats.purpose_type] || PURPOSE_TYPES['Cuidador'];
  };

  const handleRestartPurpose = () => {
    Alert.alert(
      '🔄 Reiniciar mi sentido',
      '¿Estás seguro de que quieres volver a hacer el test de propósito?\n\nTu tipo actual y respuestas se eliminarán, pero tus objetivos se mantendrán.',
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Sí, reiniciar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await authenticatedFetch(`${BACKEND_URL}/api/purpose/test`, {
                method: 'DELETE',
              });
              if (response.ok) {
                router.replace('/purpose/test');
              } else {
                // Even if delete fails, allow retry
                router.replace('/purpose/test');
              }
            } catch (error) {
              // Navigate anyway to allow retry
              router.replace('/purpose/test');
            }
          },
        },
      ]
    );
  };

  const WheelOfLife = () => {
    try {
      const centerX = 150;
      const centerY = 150;
      const maxRadius = 120;
      const numSides = 6;
      
      const createPolygonPoints = () => {
        const points: string[] = [];
        AREAS.forEach((area, index) => {
          const angle = (Math.PI * 2 * index) / numSides - Math.PI / 2;
          const rating = areaRatings[area.key] || 5;
          const radius = (rating / 10) * maxRadius;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          points.push(`${x},${y}`);
        });
        return points.join(' ');
      };

    const guideCircles = [2, 4, 6, 8, 10].map((value) => {
      const radius = (value / 10) * maxRadius;
      return (
        <Circle
          key={value}
          cx={centerX}
          cy={centerY}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth="1"
          fill="none"
        />
      );
    });

    const axisLines = AREAS.map((area, index) => {
      const angle = (Math.PI * 2 * index) / numSides - Math.PI / 2;
      const x = centerX + maxRadius * Math.cos(angle);
      const y = centerY + maxRadius * Math.sin(angle);
      return (
        <SvgLine
          key={area.key}
          x1={centerX}
          y1={centerY}
          x2={x}
          y2={y}
          stroke="#D1D5DB"
          strokeWidth="1"
        />
      );
    });

    const labels = AREAS.map((area, index) => {
      const angle = (Math.PI * 2 * index) / numSides - Math.PI / 2;
      const labelRadius = maxRadius + 30;
      const x = centerX + labelRadius * Math.cos(angle);
      const y = centerY + labelRadius * Math.sin(angle);
      
      return (
        <SvgText
          key={area.key}
          x={x}
          y={y}
          fontSize="12"
          fill="#6B7280"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {area.label.split(' ')[0]}
        </SvgText>
      );
    });

    return (
      <Svg height="320" width="300" style={styles.wheelSvg}>
        {guideCircles}
        {axisLines}
        <Polygon
          points={createPolygonPoints()}
          fill="rgba(245, 158, 11, 0.3)"
          stroke="#F59E0B"
          strokeWidth="2"
        />
        {labels}
      </Svg>
    );
    } catch (error) {
      console.error('Error rendering WheelOfLife:', error);
      return (
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text>Error al cargar el gráfico</Text>
        </View>
      );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Text>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // If test not completed, show prompt
  if (!stats?.test_completed) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <LinearGradient
          colors={['#F59E0B', '#EF4444']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Sobriedad con Sentido</Text>
          <Text style={styles.headerSubtitle}>Construye tu vida con propósito</Text>
        </LinearGradient>

        <ScrollView style={styles.content} contentContainerStyle={styles.centerContent}>
          <Ionicons name="compass" size={80} color="#F59E0B" />
          <Text style={styles.emptyTitle}>Descubre tu propósito</Text>
          <Text style={styles.emptyText}>
            Responde un test de 12 preguntas para descubrir tus valores, fortalezas y construir un plan de vida significativo.
          </Text>
          <TouchableOpacity
            style={styles.startButton}
            onPress={() => router.push('/purpose/test')}
          >
            <Text style={styles.startButtonText}>Comenzar Test</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </ScrollView>
        
        <BottomNavigation />
      </SafeAreaView>
    );
  }

  const purposeInfo = getPurposeInfo();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#F59E0B', '#EF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.helpButton} onPress={() => setShowGuideModal(true)}>
            <Ionicons name="help-circle-outline" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.headerTitle}>Sobriedad con Sentido</Text>
        <Text style={styles.headerSubtitle}>Tu camino hacia una vida significativa</Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Days Working on Vision */}
        {stats.days_working_on_vision > 0 && (
          <View style={styles.daysCard}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.daysGradient}
            >
              <Ionicons name="flame" size={40} color="#FFFFFF" />
              <Text style={styles.daysNumber}>{stats.days_working_on_vision}</Text>
              <Text style={styles.daysLabel}>Días trabajando en tu visión</Text>
            </LinearGradient>
          </View>
        )}

        {/* Purpose Type Badge - Now expandable */}
        {stats.purpose_type && (
          <TouchableOpacity 
            style={styles.purposeCard}
            onPress={() => setShowPurposeModal(true)}
            activeOpacity={0.8}
          >
            <View style={styles.purposeHeader}>
              <View>
                <Text style={styles.purposeLabel}>Tu tipo de propósito:</Text>
                <Text style={styles.purposeType}>{purposeInfo?.emoji} {stats.purpose_type}</Text>
              </View>
              <View style={styles.expandButton}>
                <Text style={styles.expandButtonText}>Ver más</Text>
                <Ionicons name="chevron-forward" size={16} color="#F59E0B" />
              </View>
            </View>
            <View style={styles.valuesContainer}>
              {stats.top_values?.map((value: string) => (
                <View key={value} style={styles.valueBadge}>
                  <Text style={styles.valueText}>{value}</Text>
                </View>
              ))}
            </View>
          </TouchableOpacity>
        )}

        {/* Wheel of Life */}
        <View style={styles.wheelCard}>
          <Text style={styles.cardTitle}>🎯 Rueda de la Vida</Text>
          <Text style={styles.cardSubtitle}>
            Tu equilibrio actual en las 6 áreas clave
          </Text>
          <View style={styles.wheelContainer}>
            <WheelOfLife />
          </View>
          <Text style={styles.wheelHelper}>
            Toca las áreas abajo para ver detalles y crear objetivos SMART
          </Text>
        </View>

        {/* Areas Grid */}
        <View style={styles.areasGrid}>
          {AREAS.map((area) => (
            <TouchableOpacity
              key={area.key}
              style={styles.areaCard}
              onPress={() => router.push(`/purpose/${area.key}`)}
            >
              <View style={[styles.areaIconContainer, { backgroundColor: area.color + '20' }]}>
                <Ionicons name={area.icon as any} size={24} color={area.color} />
              </View>
              <Text style={styles.areaLabel}>{area.label}</Text>
              <View style={styles.areaProgress}>
                <View
                  style={[
                    styles.areaProgressBar,
                    {
                      width: `${areaRatings[area.key] * 10 || 50}%`,
                      backgroundColor: area.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.areaRating}>{areaRatings[area.key] || 5}/10</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Acciones</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/purpose/goals')}
          >
            <Ionicons name="flag" size={24} color="#F59E0B" />
            <View style={styles.actionContent}>
              <Text style={styles.actionButtonText}>Mis objetivos SMART</Text>
              <Text style={styles.actionButtonSubtext}>Específicos, Medibles, Alcanzables</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/purpose/checkin')}
          >
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            <View style={styles.actionContent}>
              <Text style={styles.actionButtonText}>Check-in semanal</Text>
              <Text style={styles.actionButtonSubtext}>Evalúa tu progreso</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/purpose/inspiration')}
          >
            <Ionicons name="bulb" size={24} color="#8B5CF6" />
            <View style={styles.actionContent}>
              <Text style={styles.actionButtonText}>Biblioteca de inspiración</Text>
              <Text style={styles.actionButtonSubtext}>Frases, historias y ejercicios</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Restart Purpose Button */}
          <TouchableOpacity
            style={styles.restartButton}
            onPress={handleRestartPurpose}
          >
            <Ionicons name="refresh" size={20} color="#6B7280" />
            <Text style={styles.restartButtonText}>Reiniciar mi sentido</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Purpose Type Modal */}
      <Modal visible={showPurposeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{purposeInfo?.emoji} {stats?.purpose_type}</Text>
              <TouchableOpacity onPress={() => setShowPurposeModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {purposeInfo && (
                <>
                  <Text style={styles.modalDescription}>{purposeInfo.description}</Text>
                  
                  {/* Afirmación destacada */}
                  <View style={styles.affirmationCard}>
                    <Text style={styles.affirmationLabel}>✨ Tu afirmación diaria:</Text>
                    <Text style={styles.affirmationText}>"{purposeInfo.affirmation}"</Text>
                  </View>
                  
                  <Text style={styles.modalSectionTitle}>💪 Tus Fortalezas</Text>
                  <View style={styles.strengthsContainer}>
                    {purposeInfo.strengths.map((strength, index) => (
                      <View key={index} style={styles.strengthBadge}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={styles.strengthText}>{strength}</Text>
                      </View>
                    ))}
                  </View>

                  <Text style={styles.modalSectionTitle}>💡 Consejos para tu Recuperación</Text>
                  {purposeInfo.tips.map((tip, index) => (
                    <View key={index} style={styles.tipCard}>
                      <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                      <Text style={styles.tipText}>{tip}</Text>
                    </View>
                  ))}

                  <Text style={styles.modalSectionTitle}>🎯 Valores que te definen</Text>
                  <View style={styles.valuesModalContainer}>
                    {stats?.top_values?.map((value: string) => (
                      <View key={value} style={styles.valueModalBadge}>
                        <Text style={styles.valueModalText}>{value}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowPurposeModal(false)}
            >
              <Text style={styles.modalButtonText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Guide Modal - How to use */}
      <Modal visible={showGuideModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>¿Cómo usar esta sección?</Text>
              <TouchableOpacity onPress={() => setShowGuideModal(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.guideSection}>
                <View style={styles.guideIcon}>
                  <Ionicons name="compass" size={32} color="#F59E0B" />
                </View>
                <Text style={styles.guideTitle}>1. Descubre tu Propósito</Text>
                <Text style={styles.guideText}>
                  El test inicial identifica tu tipo de propósito, valores y fortalezas. Esto te ayuda a entender qué te motiva en la vida.
                </Text>
              </View>

              <View style={styles.guideSection}>
                <View style={styles.guideIcon}>
                  <Ionicons name="pie-chart" size={32} color="#3B82F6" />
                </View>
                <Text style={styles.guideTitle}>2. Rueda de la Vida</Text>
                <Text style={styles.guideText}>
                  Visualiza tu equilibrio en 6 áreas clave. Identifica qué áreas necesitan más atención para una vida balanceada.
                </Text>
              </View>

              <View style={styles.guideSection}>
                <View style={styles.guideIcon}>
                  <Ionicons name="flag" size={32} color="#10B981" />
                </View>
                <Text style={styles.guideTitle}>3. Objetivos SMART</Text>
                <Text style={styles.guideText}>
                  Crea objetivos en cada área que sean:{'\n'}
                  • <Text style={styles.bold}>S</Text>pecíficos{'\n'}
                  • <Text style={styles.bold}>M</Text>edibles{'\n'}
                  • <Text style={styles.bold}>A</Text>lcanzables{'\n'}
                  • <Text style={styles.bold}>R</Text>elevantes{'\n'}
                  • <Text style={styles.bold}>T</Text>emporales
                </Text>
              </View>

              <View style={styles.guideSection}>
                <View style={styles.guideIcon}>
                  <Ionicons name="calendar" size={32} color="#8B5CF6" />
                </View>
                <Text style={styles.guideTitle}>4. Check-in Semanal</Text>
                <Text style={styles.guideText}>
                  Cada semana evalúa tu progreso, celebra logros y ajusta tu plan. La consistencia es clave en la recuperación.
                </Text>
              </View>

              <View style={styles.guideHighlight}>
                <Ionicons name="heart" size={24} color="#EF4444" />
                <Text style={styles.guideHighlightText}>
                  "Sobriedad con Sentido" te ayuda a construir una vida que vale la pena vivir, no solo evitar el uso de sustancias.
                </Text>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowGuideModal(false)}
            >
              <Text style={styles.modalButtonText}>¡Comenzar!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: 10,
    paddingBottom: 14,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  backButton: {
    padding: 4,
  },
  helpButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#FEF3C7',
  },
  content: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 24,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#A1A1AA',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  daysCard: {
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  daysGradient: {
    padding: 32,
    alignItems: 'center',
  },
  daysNumber: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  daysLabel: {
    fontSize: 16,
    color: '#FEF3C7',
    marginTop: 8,
    textAlign: 'center',
  },
  purposeCard: {
    backgroundColor: '#1A1A1A',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  purposeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  purposeLabel: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 4,
  },
  purposeType: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  expandButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
  },
  valuesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  valueBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  valueText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '600',
  },
  wheelCard: {
    backgroundColor: '#1A1A1A',
    margin: 16,
    marginTop: 0,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#A1A1AA',
    marginBottom: 20,
  },
  wheelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  wheelSvg: {
    alignSelf: 'center',
  },
  wheelHelper: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 12,
  },
  areasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 12,
  },
  areaCard: {
    width: (width - 56) / 2,
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  areaIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  areaLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  areaProgress: {
    height: 6,
    backgroundColor: '#0D0D0D',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  areaProgressBar: {
    height: '100%',
    borderRadius: 3,
  },
  areaRating: {
    fontSize: 12,
    color: '#A1A1AA',
    fontWeight: '600',
  },
  actionsSection: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  actionButtonSubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2D2D2D',
    borderStyle: 'dashed',
    marginTop: 8,
    gap: 8,
  },
  restartButtonText: {
    fontSize: 14,
    color: '#A1A1AA',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#1A1A1A',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  modalDescription: {
    fontSize: 16,
    color: '#4B5563',
    lineHeight: 24,
    marginBottom: 20,
  },
  affirmationCard: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  affirmationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#D97706',
    marginBottom: 8,
  },
  affirmationText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: '#92400E',
    lineHeight: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 12,
    marginTop: 8,
  },
  strengthsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  strengthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  strengthText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '600',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#166534',
    lineHeight: 20,
  },
  valuesModalContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  valueModalBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  valueModalText: {
    fontSize: 14,
    color: '#7C3AED',
    fontWeight: '600',
  },
  modalButton: {
    backgroundColor: '#F59E0B',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  // Guide modal styles
  guideSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  guideIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#0D0D0D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  guideTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  guideText: {
    fontSize: 14,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 22,
  },
  bold: {
    fontWeight: 'bold',
    color: '#F59E0B',
  },
  guideHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  guideHighlightText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
