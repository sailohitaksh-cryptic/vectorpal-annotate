'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Question {
  id: number;
  has_two_images: boolean;
  image_a_path: string;
  image_b_path: string | null;
  is_complete: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'unannotated' | 'annotated'>('unannotated');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchQuestions(activeTab, 1);
  }, [activeTab]);

  const fetchQuestions = async (status: 'unannotated' | 'annotated', page: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/questions?status=${status}&page=${page}`);
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }

      const data = await response.json();
      setQuestions(data.questions);
      setPagination(data.pagination);
      
      // Get user email from first response
      if (!userEmail && data.questions.length > 0) {
        // We'll get this from a separate endpoint
        const userResponse = await fetch('/api/auth/me');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserEmail(userData.email);
        }
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  const handlePageChange = (newPage: number) => {
    fetchQuestions(activeTab, newPage);
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-white text-2xl font-semibold">
            Welcome, {userEmail || 'cbid1@vectorcam.com'}
          </h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-400">{userEmail || 'cbid1@vectorcam.com'}</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="flex px-6">
          <button
            onClick={() => setActiveTab('unannotated')}
            className={`px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'unannotated'
                ? 'text-blue-500 border-blue-500'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Unannotated
          </button>
          <button
            onClick={() => setActiveTab('annotated')}
            className={`px-6 py-4 font-medium transition-colors border-b-2 ${
              activeTab === 'annotated'
                ? 'text-blue-500 border-blue-500'
                : 'text-gray-400 border-transparent hover:text-white'
            }`}
          >
            Annotated
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-8">
        {loading ? (
          <div className="text-white text-center py-20">Loading...</div>
        ) : questions.length === 0 ? (
          <div className="text-gray-400 text-center py-20">
            No images in this section.
          </div>
        ) : (
          <>
            {/* Questions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-8">
              {questions.map((question) => (
                <Link
                  key={question.id}
                  href={`/annotate/${question.id}`}
                  className="group"
                >
                  <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden hover:border-gray-600 transition-colors">
                    {/* Thumbnail - you'll need to serve these images */}
                    <div className="aspect-square bg-gray-800 flex items-center justify-center">
                      <img
                        src={`/images/${question.image_a_path}`}
                        alt={`Question ${question.id}`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // Fallback if image doesn't exist
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="text-gray-600 text-4xl">🦟</div>
                    </div>
                    
                    {/* Question info */}
                    <div className="p-3">
                      <div className="text-gray-400 text-sm truncate mb-1">
                        {question.image_a_path}
                      </div>
                      <div className="text-green-500 text-sm font-medium">
                        {activeTab === 'annotated' ? 'Completed' : 'Pending'}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-6 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              
              <span className="text-white">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-6 py-2 bg-gray-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
