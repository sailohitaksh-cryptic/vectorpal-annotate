import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';

interface Question {
  question_number: number;
  has_two_images: boolean;
  image_a_path: string;
  image_b_path: string;
  is_completed: boolean;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalQuestions: number;
  questionsPerPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'unannotated' | 'annotated'>('unannotated');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pagination, setPagination] = useState<PaginationData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchQuestions();
    }
  }, [activeTab, currentPage, user]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();

      if (data.success) {
        setUser(data.user);
      } else {
        router.push('/login');
      }
    } catch (err) {
      router.push('/login');
    }
  };

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/questions/list?page=${currentPage}&filter=${activeTab}`
      );
      const data = await response.json();

      if (data.success) {
        setQuestions(data.questions);
        setPagination(data.pagination);
      } else {
        setError(data.message || 'Failed to fetch questions');
      }
    } catch (err) {
      setError('An error occurred while fetching questions');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  const handleTabChange = (tab: 'unannotated' | 'annotated') => {
    setActiveTab(tab);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  if (!user) {
    return <div style={styles.loading}>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Dashboard - Mosquito Annotation</title>
      </Head>

      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.welcomeText}>Welcome, {user.email}</h1>
          <button onClick={handleLogout} style={styles.logoutButton}>
            Sign Out
          </button>
        </header>

        <div style={styles.tabs}>
          <button
            onClick={() => handleTabChange('unannotated')}
            style={{
              ...styles.tab,
              ...(activeTab === 'unannotated' ? styles.activeTab : {}),
            }}
          >
            Unannotated
          </button>
          <button
            onClick={() => handleTabChange('annotated')}
            style={{
              ...styles.tab,
              ...(activeTab === 'annotated' ? styles.activeTab : {}),
            }}
          >
            Annotated
          </button>
        </div>

        <div style={styles.content}>
          {loading ? (
            <div style={styles.loading}>Loading questions...</div>
          ) : error ? (
            <div style={styles.error}>{error}</div>
          ) : questions.length === 0 ? (
            <div style={styles.noQuestions}>No images in this section.</div>
          ) : (
            <>
              <div style={styles.grid}>
                {questions.map((question) => (
                  <Link
                    key={question.question_number}
                    href={`/annotate/${question.question_number}`}
                    style={styles.card}
                  >
                    <div style={styles.imageContainer}>
                      <img
                        src={question.image_a_path}
                        alt={`Question ${question.question_number}`}
                        style={styles.image}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23333" width="200" height="200"/%3E%3Ctext fill="%23666" x="50%25" y="50%25" text-anchor="middle" dy=".3em"%3ENo Image%3C/text%3E%3C/svg%3E';
                        }}
                      />
                    </div>
                    <div style={styles.cardInfo}>
                      <div style={styles.questionNumber}>
                        Question {question.question_number}
                      </div>
                      <div
                        style={{
                          ...styles.status,
                          ...(question.is_completed
                            ? styles.statusCompleted
                            : styles.statusPending),
                        }}
                      >
                        {question.is_completed ? 'Completed' : 'Pending'}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div style={styles.pagination}>
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={!pagination.hasPreviousPage}
                    style={{
                      ...styles.paginationButton,
                      ...(pagination.hasPreviousPage ? {} : styles.disabledButton),
                    }}
                  >
                    Previous
                  </button>

                  <span style={styles.pageInfo}>
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>

                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={!pagination.hasNextPage}
                    style={{
                      ...styles.paginationButton,
                      ...(pagination.hasNextPage ? {} : styles.disabledButton),
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '24px 48px',
    borderBottom: '1px solid #2d3748',
  },
  welcomeText: {
    fontSize: '24px',
    fontWeight: '500',
  },
  logoutButton: {
    padding: '10px 20px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
  },
  tabs: {
    display: 'flex',
    borderBottom: '1px solid #2d3748',
    padding: '0 48px',
  },
  tab: {
    padding: '16px 24px',
    fontSize: '16px',
    backgroundColor: 'transparent',
    color: '#9ca3af',
    border: 'none',
    borderBottom: '2px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  activeTab: {
    color: '#3b82f6',
    borderBottomColor: '#3b82f6',
  },
  content: {
    padding: '48px',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '48px',
    color: '#9ca3af',
  },
  error: {
    padding: '16px',
    backgroundColor: '#dc2626',
    color: '#ffffff',
    borderRadius: '6px',
    textAlign: 'center' as const,
  },
  noQuestions: {
    textAlign: 'center' as const,
    padding: '48px',
    color: '#9ca3af',
    fontSize: '18px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '24px',
    marginBottom: '48px',
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    overflow: 'hidden',
    transition: 'transform 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    border: '1px solid #2d3748',
  },
  imageContainer: {
    width: '100%',
    height: '200px',
    backgroundColor: '#2d3748',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  cardInfo: {
    padding: '16px',
  },
  questionNumber: {
    fontSize: '14px',
    color: '#ffffff',
    marginBottom: '8px',
  },
  status: {
    fontSize: '12px',
    fontWeight: '500',
    padding: '4px 8px',
    borderRadius: '4px',
    display: 'inline-block',
  },
  statusCompleted: {
    backgroundColor: '#10b981',
    color: '#ffffff',
  },
  statusPending: {
    backgroundColor: '#f59e0b',
    color: '#ffffff',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '16px',
    marginTop: '32px',
  },
  paginationButton: {
    padding: '10px 20px',
    backgroundColor: '#3a4556',
    color: '#ffffff',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  disabledButton: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  pageInfo: {
    fontSize: '14px',
    color: '#9ca3af',
  },
};
