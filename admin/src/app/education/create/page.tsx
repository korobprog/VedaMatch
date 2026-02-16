'use client';

import { useState } from 'react';
import { getApiBaseURL } from '@/lib/api';
import { useRouter } from 'next/navigation';

const MADH_OPTIONS = [
  { id: 'iskcon', label: 'ISKCON' },
  { id: 'gaudiya', label: 'Gaudiya Math' },
  { id: 'srivaishnava', label: 'Sri Vaishnava' },
  { id: 'vedic', label: 'Vedic' },
  { id: 'bvs-source', label: 'BVS Source' },
  { id: 'Other', label: 'Другое' },
];

export default function CreateCoursePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    organization: 'ISKCON',
    customOrganization: '',
    is_published: false
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const organization = formData.organization === 'Other' ? formData.customOrganization : formData.organization;

    try {
      const token = localStorage.getItem('token') || (localStorage.getItem('admin_data') ? JSON.parse(localStorage.getItem('admin_data')!).token : '');
      const res = await fetch(`${getApiBaseURL()}/admin/education/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, organization })
      });

      if (res.ok) {
        router.push('/education');
      } else {
        alert('Ошибка при создании курса');
      }
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Ошибка сети');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">Создание нового курса</h1>

        <form onSubmit={handleSubmit} className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Название курса</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--foreground)]"
              placeholder="Например: Бхакти Шастри"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Описание</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--foreground)] resize-none"
              placeholder="Краткое описание курса..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Организация</label>
            <select
              name="organization"
              value={formData.organization}
              onChange={handleChange}
              className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--foreground)] cursor-pointer"
            >
              {MADH_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {formData.organization === 'Other' && (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Введите название организации</label>
              <input
                type="text"
                name="customOrganization"
                value={formData.customOrganization}
                onChange={handleChange}
                required
                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--foreground)]"
                placeholder="Название организации"
              />
            </div>
          )}

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              name="is_published"
              checked={formData.is_published}
              onChange={handleChange}
              id="is_published"
              className="w-5 h-5 rounded border-[var(--border)] accent-[var(--primary)]"
            />
            <label htmlFor="is_published" className="text-sm font-medium text-[var(--foreground)] cursor-pointer">Опубликовать курс</label>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-[var(--border)]">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-[var(--secondary)] transition-all text-[var(--foreground)]"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl font-medium disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {loading ? 'Создание...' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
