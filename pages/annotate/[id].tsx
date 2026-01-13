import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

interface QuestionData {
  questionNumber: number;
  hasTwoImages: boolean;
  imageAPath: string;
  imageBPath: string | null;
  imageADescription: string;
  imageBDescription: string;
  isCompleted: boolean;
}

export default function Annotate() {
  const router = useRouter();
  const { id } = router.query;
  const [question, setQuestion] = useState<QuestionData | null>(null);
  const [imageADescription, setImageADescription] = useState('');
  const [imageBDescription, setImageBDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (id !== undefined && id !== null) {
      fetchQuestion();
    }
  }, [id]);

  const fetchQuestion = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/questions/detail?number=${id}`);
      const data = await response.json();

      if (data.success) {
        setQuestion(data.question);
        setImageADescription(data.question.imageADescription || '');
        setImageBDescription(data.question.imageBDescription || '');
        setIsEditing(data.question.isCompleted);
      } else {
        setError(data.message || 'Failed to fetch question');
      }
    } catch (err) {
      setError('An error occurred while fetching the question');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const response = await fetch('/api/annotations/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionNumber: question?.questionNumber,
          imageADescription: imageADescription.trim(),
          imageBDescription: imageBDescription.trim(),
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(data.message);
        // Refresh question data
        await fetchQuestion();
        
        // Redirect to dashboard after 1.5 seconds
        setTimeout(() => {
          router.push('/dashboard');
        }, 1500);
      } else {
        setError(data.message || 'Failed to save annotation');
      }
    } catch (err) {
      setError('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const saveAndNavigate = async (direction: 'next' | 'previous') => {
    // Save current annotations if there's any content
    const hasContent = imageADescription.trim() !== '' || imageBDescription.trim() !== '';
    
    if (hasContent) {
      setAutoSaving(true);
      try {
        const response = await fetch('/api/annotations/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionNumber: question?.questionNumber,
            imageADescription: imageADescription.trim(),
            imageBDescription: imageBDescription.trim(),
          }),
        });

        const data = await response.json();
        if (!data.success) {
          console.error('Auto-save failed:', data.message);
        }
        
        // Wait a moment for the save to fully complete
        await new Promise(resolve => setTimeout(resolve, 300));
      } catch (err) {
        console.error('Error saving before navigation:', err);
        // Continue navigation even if save fails
      } finally {
        setAutoSaving(false);
      }
    }

    // Fetch user's assigned questions to find next/previous
    try {
      const response = await fetch('/api/questions/list');
      const data = await response.json();
      
      if (data.success && data.questions) {
        const assignedQuestions = data.questions.map((q: any) => q.question_number).sort((a: number, b: number) => a - b);
        const currentIndex = assignedQuestions.indexOf(question?.questionNumber);
        
        let targetQuestion = null;
        if (direction === 'next' && currentIndex < assignedQuestions.length - 1) {
          targetQuestion = assignedQuestions[currentIndex + 1];
        } else if (direction === 'previous' && currentIndex > 0) {
          targetQuestion = assignedQuestions[currentIndex - 1];
        }
        
        if (targetQuestion !== null) {
          router.push(`/annotate/${targetQuestion}`);
        } else {
          // No more questions in that direction, go to dashboard
          router.push('/dashboard');
        }
      } else {
        // Fallback: go to dashboard if can't fetch questions
        router.push('/dashboard');
      }
    } catch (err) {
      console.error('Error fetching assigned questions:', err);
      // Fallback: go to dashboard
      router.push('/dashboard');
    }
  };

  const getNextQuestion = () => {
    saveAndNavigate('next');
  };

  const getPreviousQuestion = () => {
    saveAndNavigate('previous');
  };

  const canSubmit = question?.hasTwoImages
    ? imageADescription.trim() !== '' && imageBDescription.trim() !== ''
    : imageADescription.trim() !== '';

  if (loading) {
    return <div style={styles.loading}>Loading question...</div>;
  }

  if (error && !question) {
    return (
      <div style={styles.container}>
        <div style={styles.error}>{error}</div>
        <Link href="/dashboard" style={styles.backLink}>
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Question {question?.questionNumber} - Mosquito Annotation</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <Link href="/dashboard" style={styles.backButton}>
            ← Back to Dashboard
          </Link>
          <h1 style={styles.title}>Question {question?.questionNumber}</h1>
          <div style={styles.spacer}></div>
        </header>

        {success && <div style={styles.successMessage}>{success}</div>}
        {error && <div style={styles.errorMessage}>{error}</div>}
        {autoSaving && <div style={styles.autoSaveIndicator}>Auto-saving...</div>}

        <div style={styles.content}>
          <div style={styles.instructionsPanel}>
            <h3 style={styles.instructionsTitle}>Instructions</h3>
            <p style={styles.instructionsText}>
              Please describe the morphological features visible in each image. 
              Focus on specific characteristics that distinguish the specimens.
            </p>
            <p style={styles.instructionsNote}>
              Note: We are gathering different ways entomologists naturally describe 
              features, not testing exact phrasing.
            </p>
          </div>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.imagesContainer}>
              {/* Image A */}
              <div style={styles.imageSection}>
                <div style={styles.imageWrapper}>
                  <img
                    src={question?.imageAPath}
                    alt="Image A"
                    style={styles.image}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23333" width="400" height="400"/%3E%3Ctext fill="%23666" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage Not Found%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
                <textarea
                  value={imageADescription}
                  onChange={(e) => setImageADescription(e.target.value)}
                  placeholder="Describe the features visible in Image A..."
                  required
                  style={styles.textarea}
                  rows={6}
                />
              </div>

              {/* Image B (if exists) */}
              {question?.hasTwoImages && question.imageBPath && (
                <div style={styles.imageSection}>
                  <div style={styles.imageWrapper}>
                    <img
                      src={question.imageBPath}
                      alt="Image B"
                      style={styles.image}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23333" width="400" height="400"/%3E%3Ctext fill="%23666" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3EImage Not Found%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  </div>
                  <textarea
                    value={imageBDescription}
                    onChange={(e) => setImageBDescription(e.target.value)}
                    placeholder="Describe the features visible in Image B..."
                    required
                    style={styles.textarea}
                    rows={6}
                  />
                </div>
              )}
            </div>

            <div style={styles.actions}>
              <button
                type="button"
                onClick={getPreviousQuestion}
                disabled={question?.questionNumber === 0}
                style={{
                  ...styles.navButton,
                  ...(question?.questionNumber === 0 ? styles.disabledButton : {}),
                }}
              >
                Previous
              </button>

              <button
                type="submit"
                disabled={!canSubmit || saving}
                style={{
                  ...styles.submitButton,
                  ...(!canSubmit || saving ? styles.submitButtonDisabled : {}),
                }}
              >
                {saving ? 'Saving...' : isEditing ? 'Update' : 'Submit'}
              </button>

              <button
                type="button"
                onClick={getNextQuestion}
                style={styles.navButton}
              >
                Next
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#ffffff',
  },
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#9ca3af',
    fontSize: '18px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 48px',
    borderBottom: '1px solid #2d3748',
  },
  backButton: {
    color: '#3b82f6',
    fontSize: '14px',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  title: {
    fontSize: '24px',
    fontWeight: '500',
  },
  spacer: {
    width: '100px',
  },
  backLink: {
    color: '#3b82f6',
    textDecoration: 'underline',
    marginTop: '16px',
    display: 'inline-block',
  },
  successMessage: {
    margin: '24px 48px',
    padding: '16px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    borderRadius: '6px',
    textAlign: 'center' as const,
  },
  errorMessage: {
    margin: '24px 48px',
    padding: '16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '6px',
    textAlign: 'center' as const,
  },
  autoSaveIndicator: {
    margin: '24px 48px',
    padding: '12px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    borderRadius: '6px',
    textAlign: 'center' as const,
    fontSize: '14px',
  },
  error: {
    padding: '16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '6px',
    textAlign: 'center' as const,
    margin: '24px',
  },
  content: {
    padding: '48px',
    display: 'flex',
    gap: '48px',
  },
  instructionsPanel: {
    flex: '0 0 300px',
    backgroundColor: '#1a1a1a',
    padding: '24px',
    borderRadius: '8px',
    border: '1px solid #2d3748',
    height: 'fit-content',
  },
  instructionsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: '#ffffff',
  },
  instructionsText: {
    fontSize: '14px',
    lineHeight: '1.6',
    color: '#d1d5db',
    marginBottom: '16px',
  },
  instructionsNote: {
    fontSize: '13px',
    lineHeight: '1.5',
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  form: {
    flex: 1,
  },
  imagesContainer: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '32px',
    marginBottom: '32px',
  },
  imageSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  imageWrapper: {
    width: '100%',
    height: '400px',
    backgroundColor: '#2d3748',
    borderRadius: '8px',
    overflow: 'hidden',
    border: '1px solid #374151',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'contain' as const,
  },
  textarea: {
    width: '100%',
    padding: '16px',
    fontSize: '14px',
    backgroundColor: '#1a1a1a',
    border: '1px solid #374151',
    borderRadius: '6px',
    color: '#ffffff',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    lineHeight: '1.5',
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '32px',
  },
  navButton: {
    padding: '12px 24px',
    backgroundColor: '#3a4556',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '12px 32px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  submitButtonDisabled: {
    backgroundColor: '#6b7280',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
};