'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Plus, ChevronDown, ChevronRight, Trash2, HelpCircle } from 'lucide-react';

const MADH_OPTIONS = [
  { id: 'iskcon', label: 'ISKCON' },
  { id: 'gaudiya', label: 'Gaudiya Math' },
  { id: 'srivaishnava', label: 'Sri Vaishnava' },
  { id: 'vedic', label: 'Vedic' },
  { id: 'bvs-source', label: 'BVS Source' },
  { id: 'Other', label: 'Другое' },
];

interface AnswerOption {
  text: string;
  is_correct: boolean;
  explanation: string;
}

interface ExamQuestion {
  ID?: number;
  text: string;
  points: number;
  options: AnswerOption[];
}

interface EducationModule {
  ID?: number;
  title: string;
  description: string;
  order: number;
  questions?: ExamQuestion[];
}

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    organization: 'ISKCON',
    customOrganization: '',
    is_published: false
  });

  const [modules, setModules] = useState<EducationModule[]>([]);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);

  // New Module State
  const [isAddingModule, setIsAddingModule] = useState(false);
  const [newModule, setNewModule] = useState({ title: '', description: '', order: 1 });

  // New Question State
  const [isAddingQuestion, setIsAddingQuestion] = useState<number | null>(null);
  const [newQuestion, setNewQuestion] = useState<ExamQuestion>({
    text: '',
    points: 1,
    options: [
      { text: '', is_correct: false, explanation: '' },
      { text: '', is_correct: false, explanation: '' }
    ]
  });

  const fetchCourse = async () => {
    try {
      const res = await fetch(`http://localhost:8081/api/education/courses/${courseId}`);
      if (res.ok) {
        const data = await res.json();
        const isStandardOrg = MADH_OPTIONS.some(opt => opt.id === data.organization);

        setFormData({
          title: data.title,
          description: data.description,
          organization: isStandardOrg ? data.organization : 'Other',
          customOrganization: isStandardOrg ? '' : data.organization,
          is_published: data.is_published
        });

        // Modules are loaded with the course via Preload in backend
        if (data.modules) {
          // We need to fetch questions for each module separately or update backend to preload them
          // For now, let's fetch questions for each module
          const modulesWithQuestions = await Promise.all(data.modules.map(async (mod: any) => {
            const token = localStorage.getItem('token') || (localStorage.getItem('admin_data') ? JSON.parse(localStorage.getItem('admin_data')!).token : '');
            const qRes = await fetch(`http://localhost:8081/api/admin/education/modules/${mod.ID}/exams`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            const questions = qRes.ok ? await qRes.json() : [];
            return { ...mod, questions };
          }));
          setModules(modulesWithQuestions);
        }
      }
    } catch (error) {
      console.error('Error fetching course:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
    }
  }, [courseId]);

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
    setSaving(true);

    const organization = formData.organization === 'Other' ? formData.customOrganization : formData.organization;

    try {
      const token = localStorage.getItem('token') || (localStorage.getItem('admin_data') ? JSON.parse(localStorage.getItem('admin_data')!).token : '');
      const res = await fetch(`http://localhost:8081/api/admin/education/courses/${courseId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...formData, organization })
      });

      if (res.ok) {
        alert('Курс обновлен');
      } else {
        alert('Ошибка при сохранении');
      }
    } catch (error) {
      console.error('Error updating course:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddModule = async () => {
    try {
      const token = localStorage.getItem('token') || (localStorage.getItem('admin_data') ? JSON.parse(localStorage.getItem('admin_data')!).token : '');
      const res = await fetch('http://localhost:8081/api/admin/education/modules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...newModule, course_id: Number(courseId) })
      });

      if (res.ok) {
        const createdModule = await res.json();
        setModules([...modules, { ...createdModule, questions: [] }]);
        setIsAddingModule(false);
        setNewModule({ title: '', description: '', order: modules.length + 2 });
      }
    } catch (error) {
      console.error('Failed to add module', error);
    }
  };

  const handleAddQuestion = async (moduleId: number) => {
    try {
      // Basic validation
      if (!newQuestion.text || newQuestion.options.length < 2) return;

      const token = localStorage.getItem('token') || (localStorage.getItem('admin_data') ? JSON.parse(localStorage.getItem('admin_data')!).token : '');
      const res = await fetch('http://localhost:8081/api/admin/education/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...newQuestion, module_id: moduleId })
      });

      if (res.ok) {
        const createdQuestion = await res.json();
        setModules(modules.map(m => {
          if (m.ID === moduleId) {
            return { ...m, questions: [...(m.questions || []), createdQuestion] };
          }
          return m;
        }));
        setIsAddingQuestion(null);
        setNewQuestion({
          text: '',
          points: 1,
          options: [{ text: '', is_correct: false, explanation: '' }, { text: '', is_correct: false, explanation: '' }]
        });
      }
    } catch (error) {
      console.error('Failed to add question', error);
    }
  };

  const updateQuestionOption = (idx: number, field: string, value: any) => {
    const newOptions = [...newQuestion.options];
    newOptions[idx] = { ...newOptions[idx], [field]: value };
    setNewQuestion({ ...newQuestion, options: newOptions });
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64 text-[var(--muted-foreground)]">Загрузка...</div>;
  }

  return (
    <>
      <div className="max-w-4xl mx-auto pb-20">
        <h1 className="text-2xl font-bold text-[var(--foreground)] mb-6">Редактирование курса #{courseId}</h1>

        {/* Course Details Form */}
        <form onSubmit={handleSubmit} className="bg-[var(--card)] rounded-xl shadow-sm border border-[var(--border)] p-6 space-y-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Название курса</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--foreground)]"
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
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">Описание</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full bg-[var(--secondary)] border-none rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-[var(--primary)]/20 text-[var(--foreground)] resize-none"
            />
          </div>

          <div className="flex justify-between items-center pt-2">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="is_published"
                checked={formData.is_published}
                onChange={handleChange}
                id="is_published"
                className="w-5 h-5 rounded border-[var(--border)] accent-[var(--primary)]"
              />
              <label htmlFor="is_published" className="text-sm font-medium text-[var(--foreground)] cursor-pointer">Опубликовать</label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 bg-[var(--primary)] hover:opacity-90 text-white rounded-xl font-medium disabled:opacity-50 transition-all"
            >
              {saving ? 'Сохранение...' : 'Сохранить детали'}
            </button>
          </div>
        </form>

        {/* Modules Section */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Модули курса</h2>
          <button
            onClick={() => setIsAddingModule(true)}
            className="flex items-center gap-2 bg-[var(--secondary)] hover:bg-[var(--primary)]/10 text-[var(--foreground)] px-4 py-2 rounded-xl transition-all"
          >
            <Plus className="w-4 h-4" /> Добавить модуль
          </button>
        </div>

        {/* Add Module Form */}
        {isAddingModule && (
          <div className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-5 mb-6 animate-in fade-in slide-in-from-top-2">
            <h3 className="font-semibold mb-4 text-[var(--foreground)]">Новый модуль</h3>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Название модуля"
                value={newModule.title}
                onChange={(e) => setNewModule({ ...newModule, title: e.target.value })}
                className="w-full bg-[var(--secondary)] border-none rounded-lg p-3 text-sm outline-none text-[var(--foreground)]"
              />
              <input
                type="text"
                placeholder="Описание модуля"
                value={newModule.description}
                onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
                className="w-full bg-[var(--secondary)] border-none rounded-lg p-3 text-sm outline-none text-[var(--foreground)]"
              />
              <div className="flex justify-end gap-3">
                <button onClick={() => setIsAddingModule(false)} className="px-4 py-2 text-sm text-[var(--muted-foreground)]">Отмена</button>
                <button onClick={handleAddModule} className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg text-sm">Сохранить</button>
              </div>
            </div>
          </div>
        )}

        {/* Modules List */}
        <div className="space-y-4">
          {modules.map((module) => (
            <div key={module.ID} className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
              <div
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-[var(--secondary)]/30 transition-colors"
                onClick={() => setExpandedModule(expandedModule === module.ID ? null : module.ID)}
              >
                <div className="flex items-center gap-3">
                  {expandedModule === module.ID ? <ChevronDown className="w-5 h-5 text-[var(--muted-foreground)]" /> : <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)]" />}
                  <div>
                    <h3 className="font-medium text-[var(--foreground)]">{module.title}</h3>
                    <p className="text-xs text-[var(--muted-foreground)]">{module.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs bg-[var(--secondary)] px-2 py-1 rounded text-[var(--muted-foreground)]">
                    {module.questions?.length || 0} вопросов
                  </span>
                </div>
              </div>

              {expandedModule === module.ID && (
                <div className="border-t border-[var(--border)] bg-[var(--secondary)]/10 p-4">
                  {/* Questions List */}
                  {module.questions?.map((q, idx) => (
                    <div key={q.ID || idx} className="bg-[var(--card)] p-3 rounded-lg border border-[var(--border)] mb-3">
                      <div className="flex justify-between items-start">
                        <p className="font-medium text-sm text-[var(--foreground)] mb-2">
                          <span className="text-[var(--primary)] mr-2">Q{idx + 1}:</span>
                          {q.text}
                        </p>
                        <span className="text-xs bg-[var(--secondary)] px-2 py-0.5 rounded text-[var(--muted-foreground)]">{q.points} балл</span>
                      </div>
                      <div className="pl-4 space-y-1">
                        {q.options.map((opt, i) => (
                          <div key={i} className={`text-xs flex items-center gap-2 ${opt.is_correct ? 'text-green-600 font-medium' : 'text-[var(--muted-foreground)]'}`}>
                            {opt.is_correct ? '✓' : '•'} {opt.text}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Add Question Button */}
                  {!isAddingQuestion && (
                    <button
                      onClick={() => setIsAddingQuestion(module.ID!)}
                      className="w-full py-2 border-2 border-dashed border-[var(--border)] rounded-lg text-[var(--muted-foreground)] text-sm hover:border-[var(--primary)] hover:text-[var(--primary)] transition-all flex items-center justify-center gap-2"
                    >
                      <HelpCircle className="w-4 h-4" /> Добавить вопрос
                    </button>
                  )}

                  {/* Add Question Form */}
                  {isAddingQuestion === module.ID && (
                    <div className="bg-[var(--card)] p-4 rounded-xl border border-[var(--primary)]/30 mt-4">
                      <h4 className="font-medium text-sm mb-3 text-[var(--foreground)]">Новый вопрос</h4>
                      <input
                        type="text"
                        placeholder="Текст вопроса"
                        value={newQuestion.text}
                        onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                        className="w-full bg-[var(--secondary)] border-none rounded-lg p-2.5 text-sm mb-3 outline-none text-[var(--foreground)]"
                      />

                      <div className="space-y-2 mb-4">
                        <p className="text-xs font-bold text-[var(--muted-foreground)] uppercase">Варианты ответов</p>
                        {newQuestion.options.map((opt, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correct_option"
                              checked={opt.is_correct}
                              onChange={() => {
                                const newOpts = newQuestion.options.map((o, i) => ({ ...o, is_correct: i === idx }));
                                setNewQuestion({ ...newQuestion, options: newOpts });
                              }}
                              className="accent-[var(--primary)]"
                            />
                            <input
                              type="text"
                              placeholder={`Вариант ${idx + 1}`}
                              value={opt.text}
                              onChange={(e) => updateQuestionOption(idx, 'text', e.target.value)}
                              className="flex-1 bg-[var(--secondary)] border-none rounded p-2 text-xs outline-none text-[var(--foreground)]"
                            />
                            <input
                              type="text"
                              placeholder="Объяснение (опц.)"
                              value={opt.explanation}
                              onChange={(e) => updateQuestionOption(idx, 'explanation', e.target.value)}
                              className="flex-1 bg-[var(--secondary)] border-none rounded p-2 text-xs outline-none text-[var(--foreground)]"
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => setNewQuestion({ ...newQuestion, options: [...newQuestion.options, { text: '', is_correct: false, explanation: '' }] })}
                          className="text-xs text-[var(--primary)] hover:underline"
                        >
                          + Добавить вариант
                        </button>
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setIsAddingQuestion(null)}
                          className="px-3 py-1.5 text-xs text-[var(--muted-foreground)]"
                        >
                          Отмена
                        </button>
                        <button
                          onClick={() => handleAddQuestion(module.ID!)}
                          className="px-3 py-1.5 bg-[var(--primary)] text-white rounded-lg text-xs"
                        >
                          Сохранить вопрос
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          {modules.length === 0 && (
            <div className="text-center py-10 text-[var(--muted-foreground)] bg-[var(--secondary)]/20 rounded-xl border border-dashed border-[var(--border)]">
              В этом курсе пока нет модулей
            </div>
          )}
        </div>
      </div>
    </>
  );
}
