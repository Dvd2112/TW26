import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Button, Tag } from 'antd';
import SectionTitle from '../../components/SectionTitle/SectionTitle';
import styles from '../../styles/Tiers.module.css';

const tiers = [
  {
    name: 'PRATA',
    color: '#D9D9D9',
    featured: false,
    benefits: [
      { label: 'Naming Rights Exclusivo', included: false },
      { label: 'Logo nos Slides das apresentações', included: true },
      { label: 'Espaço para Banner no evento', included: true },
      { label: 'Logo no Site e Redes Sociais', included: true },
      { label: 'Logo em Camisetas', included: false },
      { label: 'Stand no evento', included: false },
      { label: 'Acesso aos CVs dos alunos', included: false },
      { label: 'Palestra / Presença de Palco', included: false },
    ],
  },
  {
    name: 'OURO',
    color: '#FFD700',
    featured: false,
    benefits: [
      { label: 'Naming Rights Exclusivo', included: false },
      { label: 'Logo em Destaque nos Slides', included: true },
      { label: 'Stand de 6m² no evento', included: true },
      { label: 'Logo no Site e Redes Sociais', included: true },
      { label: 'Logo em Camisetas e Brindes', included: true },
      { label: 'Acesso aos CVs dos alunos', included: true },
      { label: 'Logo Master nos materiais', included: true },
      { label: 'Palestra / Presença de Palco', included: false },
    ],
  },
  {
    name: 'DIAMANTE',
    color: '#8A00C4',
    featured: true,
    benefits: [
      { label: 'Naming Rights Exclusivo (ex: Hackathon Sua Marca)', included: true },
      { label: 'Palestra Magna + Logo Master', included: true },
      { label: 'Stand de 12m² + Sampling', included: true },
      { label: 'Logo no Site, Redes e Materiais', included: true },
      { label: 'Logo em Camisetas e Brindes', included: true },
      { label: 'Acesso antecipado aos CVs dos alunos', included: true },
      { label: 'Customização de contrapartidas por KPI', included: true },
      { label: 'Posição exclusiva no palco principal', included: true },
    ],
  },
];

export default function Tiers() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="tiers" className={styles.section}>
      <div className={styles.wrapper}>
        <SectionTitle
          tag="// 06 – Cotas de Patrocínio"
          title="Escolha o Nível do Seu Impacto"
          subtitle="Estamos abertos a customizar contrapartidas que alinhem o investimento aos KPIs de marketing e RH da sua empresa."
          center
        />

        <div ref={ref} className={styles.grid}>
          {tiers.map((tier, i) => (
            <motion.div
              key={tier.name}
              className={`${styles.card} ${tier.featured ? styles.featured : ''}`}
              style={{ '--tier-color': tier.color }}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
            >
              {tier.featured && (
                <div className={styles.featuredBadge}>
                  ⭐ Mais Completa
                </div>
              )}
              <div className={styles.tierTop}>
                <span className={styles.tierName} style={{ color: tier.color }}>
                  {tier.name}
                </span>
              </div>

              <ul className={styles.benefitList}>
                {tier.benefits.map((b) => (
                  <li key={b.label} className={`${styles.benefitItem} ${!b.included ? styles.excluded : ''}`}>
                    <span className={styles.check}>
                      {b.included ? '✓' : '✗'}
                    </span>
                    <span>{b.label}</span>
                  </li>
                ))}
              </ul>

              <a href="#contact">
                <Button
                  type={tier.featured ? 'primary' : 'default'}
                  block
                  size="large"
                  style={
                    tier.featured
                      ? { background: '#8A00C4', color: '#FFF', border: 'none', fontWeight: 700, height: 48 }
                      : { background: 'transparent', color: tier.color, border: `1px solid ${tier.color}`, fontWeight: 600, height: 44 }
                  }
                >
                  Quero essa Cota
                </Button>
              </a>
            </motion.div>
          ))}
        </div>

        <p className={styles.note}>
          * As cotas são personalizáveis. Entre em contato para adequar os benefícios ao
          seu orçamento e objetivos de negócio.
        </p>
      </div>
    </section>
  );
}

