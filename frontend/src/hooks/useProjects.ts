import { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../api';

export interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

export const useProjects = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isCreatingProject, setIsCreatingProject] = useState(false);

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`);
      const data = await res.json();
      setProjects(data);
    } catch (e) {
      console.error('Failed to fetch projects', e);
    }
  }, []);

  const createProject = async (name: string): Promise<string | null> => {
    if (!name.trim()) return null;
    setIsCreatingProject(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description: '' })
      });
      const data = await res.json();
      if (data.status === 'success') {
        await fetchProjects();
        return data.project_id;
      }
    } catch (e) {
      console.error('Failed to create project', e);
    } finally {
      setIsCreatingProject(false);
    }
    return null;
  };

  const renameProject = async (id: string, newName: string) => {
    if (!newName.trim()) return false;
    try {
      const res = await fetch(`${API_BASE_URL}/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, description: '' })
      });
      const data = await res.json();
      if (data.status === 'success') {
        setProjects(prev => prev.map(p => p.id === id ? { ...p, name: newName } : p));
        return true;
      }
    } catch (err) {
      console.error("Rename error", err);
    }
    return false;
  };

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { projects, isCreatingProject, createProject, renameProject, fetchProjects };
};
