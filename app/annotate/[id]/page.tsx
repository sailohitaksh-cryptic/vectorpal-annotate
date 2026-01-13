'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

interface Question {
  id: number;
  has_two_images: boolean;
  image_a_path: string;
  image_b_path: string | null;
  description_a: string | null;
  description_b: string | null;
  is_complete: boolean;
}

export default function AnnotatePage() {
  const [question, setQuestion] = useState<Question | null>(null);
  const [descriptionA, setDescriptionA] = useState('');
  const [descriptionB, setDescriptionB] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');
  const router = useRouter();
  const params = useParams();
  const questionId = params.id as string;

  useEffect(() => {
    fetchQuestion();
  }, [questionId]);

  const fetchQuestion = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/questions/${questionId}`);
      
      if (response.status === 401) {
        router.push('/login');
        return;
      }

      if (response.status === 403) {
        setMessage('You do not have access to this question');
        setLoading(false);
        return;
      }

      const data = await response.json();
      setQuestion(data);
      setDescriptionA(data.description_a || '');
      setDescriptionB(data.description_b || '');
      setIsEditing(!!data.is_complete);
    } catch (error) {
      console.error('Error fetching question:', error);
      setMessage('Error loading question');
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!descriptionA.trim()) {
      setMessage('Please fill in the description for the first image');
      return;
    }
    
    if (question?.has_two_images && !descriptionB.trim()) {
      setMessage('Please fill in the description for the second image');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId: parseInt(questionId),
          descriptionA: descriptionA.trim(),
          descriptionB: question?.has_two_images ? descriptionB.trim() : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || 'Failed to save annotation');
        setSaving(false);
        return;
      }

      setMessage('Annotation saved successfully!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    } catch (error) {
      console.error('Error saving annotation:', error);
      setMessage('An error occurred while saving');
      setSaving(false);
    }
  };

  const canSubmit = () => {
    if (!descriptionA.trim()) return false;
    if (question?.has_two_images && !descriptionB.trim()) return false;
    return true;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!question) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-xl">{message || 'Question not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <Link 
            href="/dashboard"
            className="text-blue-500 hover:text-blue-400 transition-colors"
          >
            ← Back to Dashboard
          </Link>
          <h1 className="text-white text-xl font-semibold">
            Question {questionId}
          </h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </div>
      </header>

      {/* Content */}
      <div className="px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Status message */}
          {message && (
            <div className={`mb-6 px-4 py-3 rounded ${
              message.includes('success') 
                ? 'bg-green-500/10 border border-green-500 text-green-500'
                : 'bg-red-500/10 border border-red-500 text-red-500'
            }`}>
              {message}
            </div>
          )}

          {/* Instructions placeholder */}
          <div className="mb-8 bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-white text-lg font-semibold mb-2">Instructions</h2>
            <p className="text-gray-400">
              {/* Instructions will be added later */}
              Please describe the morphological features you observe in the image(s). 
              We&apos;re not testing you on exact phrasing, but rather trying to gather different 
              ways in which an entomologist might naturally describe each feature in their day-to-day work.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Images and textboxes */}
            <div className={`grid ${question.has_two_images ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-8 mb-8`}>
              {/* Image A */}
              <div>
                <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-4">
                  <div className="aspect-square bg-gray-800 flex items-center justify-center">
                    <img
                      src={`/images/${question.image_a_path}`}
                      alt="Feature A"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                      }}
                    />
                    <div className="hidden flex-col items-center justify-center text-gray-600">
                      <div className="text-6xl mb-2">🦟</div>
                      <div className="text-sm">Image not found</div>
                    </div>
                  </div>
                </div>
                <textarea
                  value={descriptionA}
                  onChange={(e) => setDescriptionA(e.target.value)}
                  placeholder="Enter description for this image..."
                  className="w-full h-32 px-4 py-3 bg-gray-900 border border-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  required
                />
              </div>

              {/* Image B (if exists) */}
              {question.has_two_images && question.image_b_path && (
                <div>
                  <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden mb-4">
                    <div className="aspect-square bg-gray-800 flex items-center justify-center">
                      <img
                        src={`/images/${question.image_b_path}`}
                        alt="Feature B"
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          (e.currentTarget.nextSibling as HTMLElement).style.display = 'flex';
                        }}
                      />
                      <div className="hidden flex-col items-center justify-center text-gray-600">
                        <div className="text-6xl mb-2">🦟</div>
                        <div className="text-sm">Image not found</div>
                      </div>
                    </div>
                  </div>
                  <textarea
                    value={descriptionB}
                    onChange={(e) => setDescriptionB(e.target.value)}
                    placeholder="Enter description for this image..."
                    className="w-full h-32 px-4 py-3 bg-gray-900 border border-gray-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    required={question.has_two_images}
                  />
                </div>
              )}
            </div>

            {/* Submit button */}
            <div className="flex justify-center gap-4">
              <Link
                href="/dashboard"
                className="px-8 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={!canSubmit() || saving}
                className={`px-8 py-3 rounded-lg font-medium transition-colors ${
                  canSubmit() && !saving
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-green-600/30 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? 'Saving...' : isEditing ? 'Update' : 'Submit'}
              </button>
            </div>
          </form>

          {/* Warning message for editing */}
          {isEditing && (
            <div className="mt-6 bg-yellow-500/10 border border-yellow-500 text-yellow-500 px-4 py-3 rounded text-center">
              Remember to submit your changes, or they will be sent back to unannotated.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
