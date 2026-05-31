import { useEffect, useMemo, useState } from 'react';

type Step = 1 | 2 | 3 | 'complete';

type Contact = {
  id: number;
  name: string;
  phone: string;
  messages: number;
  last: string;
  avatar: string;
};

type RewardType = 'text' | 'csv' | 'pdf';

const contacts: Contact[] = [
  { id: 1, name: 'Alex Rivera', phone: '+1 (415) 555-0192', messages: 1247, last: '2 hours ago', avatar: 'AR' },
  { id: 2, name: 'Jordan Lee', phone: '+1 (310) 555-8473', messages: 892, last: 'Yesterday', avatar: 'JL' },
  { id: 3, name: 'Sam Chen', phone: 'sam.chen@icloud.com', messages: 2104, last: '3 days ago', avatar: 'SC' },
  { id: 4, name: 'Taylor Brooks', phone: '+1 (646) 555-3321', messages: 567, last: 'Last week', avatar: 'TB' },
];

const rewards: Array<{
  type: RewardType;
  title: string;
  description: string;
  label: string;
  icon: string;
  recommended?: boolean;
}> = [
  { type: 'text', title: 'Simple Report', description: 'Clean, readable text file. Perfect for personal records.', label: 'TXT', icon: 'fa-file-lines' },
  { type: 'csv', title: 'Detailed Log', description: 'Full metadata with timestamps. Great for analysis.', label: 'CSV', icon: 'fa-table' },
  { type: 'pdf', title: 'Official Record', description: 'Court-ready PDF with integrity verification.', label: 'PDF', icon: 'fa-file-pdf', recommended: true },
]

function getProgress(step: Step) {
  if (step === 'complete') {
    return 100;
  }

  return step * 33;
}

export function App() {
  const [step, setStep] = useState<Step>(1);
  const [level, setLevel] = useState(1);
  const [progress, setProgress] = useState(33);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedReward, setSelectedReward] = useState<RewardType | null>(null);
  const [uploadPhase, setUploadPhase] = useState<'idle' | 'scanning' | 'verified'>('idle');
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; size: number; color: string; delay: number; opacity: number }>>([]);

  const selectedRewardLabel = useMemo(
    () => rewards.find((reward) => reward.type === selectedReward)?.label ?? '—',
    [selectedReward],
  );

  useEffect(() => {
    setProgress(getProgress(step));
    setLevel(step === 'complete' ? 3 : step);
  }, [step]);

  useEffect(() => {
    if (step !== 'complete') {
      return undefined;
    }

    const colors = ['#f59e0b', '#fbbf24', '#fcd34d'];
    const pieces = Array.from({ length: 80 }, (_, index) => ({
      id: index,
      left: Math.random() * 100,
      size: Math.random() * 8 + 6,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: index * 3,
      opacity: Math.random() + 0.4,
    }));

    setConfetti(pieces);

    const timeout = window.setTimeout(() => setConfetti([]), 4000);
    return () => window.clearTimeout(timeout);
  }, [step]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Enter' && step === 1 && uploadPhase === 'idle') {
        startUpload();
      }
    };

    const onKeyPress = (event: KeyboardEvent) => {
      if (event.key === '?') {
        setSelectedContact(null);
        setSelectedReward(null);
        setUploadPhase('verified');
        setStep(2);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keypress', onKeyPress);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keypress', onKeyPress);
    };
  }, [step, uploadPhase]);

  const goToStep = (nextStep: Step) => {
    setStep(nextStep);
    if (nextStep !== 'complete') {
      setLevel(nextStep);
      setProgress(getProgress(nextStep));
    }
  };

  const startUpload = () => {
    setUploadPhase('scanning');

    window.setTimeout(() => {
      setUploadPhase('verified');

      window.setTimeout(() => {
        goToStep(2);
      }, 800);
    }, 2200);
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);

    window.setTimeout(() => {
      goToStep(3);
    }, 600);
  };

  const handleRewardSelect = (reward: RewardType) => {
    setSelectedReward(reward);

    window.setTimeout(() => {
      goToStep('complete');
    }, 500);
  };

  const downloadEvidence = () => {
    window.alert(
      `✅ Evidence package downloaded!\n\nContact: ${selectedContact?.name ?? 'Unknown'}\nFormat: ${selectedReward?.toUpperCase() ?? '—'}\n\nThank you for completing Backup Quest.`,
    );

    window.location.reload();
  };

  return (
    <main className="quest-app">
      <nav className="top-nav">
        <div className="nav-inner">
          <div className="brand-block">
            <div className="brand-icon" aria-hidden="true">
              <i className="fa-solid fa-shield-halved" />
            </div>
            <div>
              <span className="brand-title">Backup Quest</span>
            </div>
          </div>

          <div className="nav-metrics">
            <div className="status-pill">
              <span className="status-dot" />
              <span>Online</span>
            </div>

            <div className="level-pill">
              <span className="level-label">Level</span>
              <span className="level-value">{String(level).padStart(2, '0')}</span>
              <span className="level-divider" />
              <span className="level-xp">XP 240 / 500</span>
            </div>
          </div>
        </div>
      </nav>

      <div className="quest-shell">
        <section className="hero-block">
          <div className="hero-chip">
            <i className="fa-solid fa-gauge-high" />
            <span>Forensic Grade • v2.4</span>
          </div>

          <h1>Let&apos;s recover your story.</h1>
          <p>A simple 3-step quest to extract and preserve your iMessage history.</p>
        </section>

        <section className="progress-card" aria-label="Progress">
          <div className="progress-head">
            <span>PROGRESS</span>
            <span>
              <strong>{progress}</strong>%
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        </section>

        <section className={`step-block ${step === 1 ? 'is-visible' : 'is-hidden'}`}>
          <div className="step-head">
            <div className="step-number">01</div>
            <h2>Upload your iPhone backup</h2>
          </div>

          <button type="button" className="upload-area" onClick={startUpload}>
            <div className="upload-icon">
              <i className={`fa-solid fa-mobile-screen-button ${uploadPhase === 'scanning' ? 'is-spinning' : ''}`} />
            </div>

            <h3>{uploadPhase === 'scanning' ? 'Scanning backup...' : uploadPhase === 'verified' ? 'Backup verified!' : 'Drop your backup here'}</h3>
            <p>Supports full iPhone backups (iMazing, Finder, or encrypted)</p>

            <span className="browse-pill">
              <i className="fa-solid fa-upload" />
              <span>Browse files</span>
            </span>
          </button>

          <p className="privacy-note">Your backup stays private. Nothing is uploaded to any server.</p>
        </section>

        <section className={`step-block ${step === 2 ? 'is-visible' : 'is-hidden'}`}>
          <div className="step-head">
            <div className="step-number">02</div>
            <h2>Who are we saving?</h2>
          </div>

          <div className="contact-grid">
            {contacts.map((contact) => {
              const isSelected = selectedContact?.id === contact.id;

              return (
                <button
                  key={contact.id}
                  type="button"
                  className={`contact-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleContactSelect(contact)}
                >
                  <div className="avatar">{contact.avatar}</div>
                  <div className="contact-copy">
                    <div className="contact-main">
                      <div>
                        <div className="contact-name">{contact.name}</div>
                        <div className="contact-phone">{contact.phone}</div>
                      </div>
                      <div className="contact-stats">
                        <div className="contact-msgs">{contact.messages} msgs</div>
                        <div className="contact-last">{contact.last}</div>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`step-block ${step === 3 ? 'is-visible' : 'is-hidden'}`}>
          <div className="step-head">
            <div className="step-number">03</div>
            <h2>Choose your reward</h2>
          </div>

          <div className="reward-grid">
            {rewards.map((reward) => {
              const isSelected = selectedReward === reward.type;

              return (
                <button
                  key={reward.type}
                  type="button"
                  className={`reward-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleRewardSelect(reward.type)}
                >
                  {reward.recommended ? <div className="recommended-badge">RECOMMENDED</div> : null}
                  <div className="reward-icon">
                    <i className={`fa-solid ${reward.icon}`} />
                  </div>
                  <h3>{reward.title}</h3>
                  <p>{reward.description}</p>
                  <span className="reward-label">{reward.label}</span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={`completion-block ${step === 'complete' ? 'is-visible' : 'is-hidden'}`}>
          <div className="completion-badge">
            <i className="fa-solid fa-trophy" />
          </div>

          <h2>Quest Complete!</h2>
          <p>Your evidence package has been prepared.</p>

          <button type="button" className="download-button" onClick={downloadEvidence}>
            <i className="fa-solid fa-download" />
            <span>Download Evidence Package</span>
          </button>

          <span className="completion-note">Includes integrity report + timestamp verification</span>
        </section>
      </div>

      {confetti.map((piece) => (
        <span
          key={piece.id}
          className="confetti"
          style={{
            left: `${piece.left}vw`,
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            top: '-20px',
            opacity: piece.opacity,
            animationDelay: `${piece.delay}ms`,
          }}
        />
      ))}

      <div className="sr-only" aria-live="polite">
        {selectedContact ? `Selected contact ${selectedContact.name}` : 'No contact selected'}
        {selectedReward ? `Selected reward ${selectedRewardLabel}` : 'No reward selected'}
      </div>
    </main>
  );
}