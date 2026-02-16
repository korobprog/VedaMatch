'use client';

import { useState, useEffect } from 'react';
import AdminLayout from '@/components/AdminLayout';
import { getApiBaseURL } from '@/lib/api';
import { useRouter } from 'next/navigation';

interface EducationCourse {
  ID: number;
  title: string;
  description: string;
  organization: string;
  is_published: boolean;
}

export default function EducationPage() {
  const [courses, setCourses] = useState<EducationCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('token') || (localStorage.getItem('admin_data') ? JSON.parse(localStorage.getItem('admin_data')!).token : '');
      const res = await fetch(`${getApiBaseURL()}/admin/education/courses`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setCourses(data);
      }
    } catch (error) {
      console.error('Failed to fetch courses', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[var(--foreground)]">Образовательные Курсы</h1>
        <button
          onClick={() => router.push('/education/create')}
          className="bg-[var(--primary)] hover:opacity-90 text-white px-4 py-2 rounded-lg transition-all"
        >
          + Создать Курс
        </button>
      </div>

      {loading ? (
        <div className="text-[var(--muted-foreground)]">Загрузка...</div>
      ) : (
        <div className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] overflow-hidden">
          <table className="min-w-full divide-y divide-[var(--border)]">
            <thead className="bg-[var(--secondary)]/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Название</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Организация</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Статус</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">Действия</th>
              </tr>
            </thead>
            <tbody className="bg-[var(--card)] divide-y divide-[var(--border)] text-[var(--foreground)]">
              {courses.map((course) => (
                <tr key={course.ID} className="hover:bg-[var(--secondary)]/30">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted-foreground)]">#{course.ID}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{course.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                      {course.organization}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {course.is_published ? (
                      <span className="text-green-500 font-bold">Опубликован</span>
                    ) : (
                      <span className="text-[var(--muted-foreground)]">Черновик</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => router.push(`/education/edit/${course.ID}`)}
                      className="text-[var(--primary)] hover:opacity-80 mr-4"
                    >
                      Ред.
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {courses.length === 0 && (
            <div className="p-8 text-center text-[var(--muted-foreground)]">Нет курсов</div>
          )}
        </div>
      )}
    </>
  );
}
