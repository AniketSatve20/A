import express, { Router } from 'express';

const router = Router();

// In-memory storage
const projects = new Map<number, any>();
let projectIdCounter = 1;

// Mock data
projects.set(1, {
  id: 1,
  title: 'E-commerce Platform Development',
  description: 'Build a full-stack e-commerce platform with React and Node.js',
  budget: 5000,
  status: 'open',
  skillsRequired: ['React', 'Node.js', 'MongoDB'],
  createdAt: new Date().toISOString(),
});

projects.set(2, {
  id: 2,
  title: 'Mobile App for Fitness Tracking',
  description: 'iOS/Android app for tracking workouts and nutrition',
  budget: 3000,
  status: 'in-progress',
  skillsRequired: ['React Native', 'Firebase'],
  createdAt: new Date().toISOString(),
});

projects.set(3, {
  id: 3,
  title: 'AI Chatbot Integration',
  description: 'Integrate AI chatbot using Hugging Face API',
  budget: 2000,
  status: 'open',
  skillsRequired: ['Python', 'Machine Learning', 'API Integration'],
  createdAt: new Date().toISOString(),
});

projectIdCounter = 4;

// Get all projects
router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const allProjects = Array.from(projects.values()).slice(0, limit);

  res.json({
    projects: allProjects,
    total: projects.size,
  });
});

// Get single project
router.get('/:id', (req, res) => {
  const project = projects.get(parseInt(req.params.id));

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  res.json({ project });
});

// Create project
router.post('/', (req, res) => {
  const { title, description, budget, skillsRequired } = req.body;

  if (!title || !budget) {
    return res.status(400).json({ error: 'Title and budget are required' });
  }

  const newProject = {
    id: projectIdCounter++,
    title,
    description,
    budget,
    status: 'open',
    skillsRequired: skillsRequired || [],
    createdAt: new Date().toISOString(),
  };

  projects.set(newProject.id, newProject);

  res.status(201).json({ project: newProject });
});

// Update project
router.put('/:id', (req, res) => {
  const project = projects.get(parseInt(req.params.id));

  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  const updated = { ...project, ...req.body };
  projects.set(project.id, updated);

  res.json({ project: updated });
});

export { router as projectApi };
