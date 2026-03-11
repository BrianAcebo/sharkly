import express from 'express';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  listPostsAdmin,
  listPostsPublic,
  getPostBySlug,
  getPostByIdAdmin,
  createPost,
  updatePost,
  deletePost,
} from '../controllers/blogController.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// ── Public endpoints (no auth) ────────────────────────────────────────────────
router.get('/categories',       listCategories);
router.get('/posts',            listPostsPublic);
router.get('/posts/:slug',      getPostBySlug);

// ── Admin endpoints (Supabase auth required) ─────────────────────────────────
// Frontend admin dashboard has its own password gate — no need to double-check here.
router.use('/admin', requireAuth);

router.get('/admin/posts',             listPostsAdmin);
router.get('/admin/posts/:id',         getPostByIdAdmin);
router.post('/admin/posts',            createPost);
router.put('/admin/posts/:id',         updatePost);
router.delete('/admin/posts/:id',      deletePost);

router.post('/admin/categories',       createCategory);
router.put('/admin/categories/:id',    updateCategory);
router.delete('/admin/categories/:id', deleteCategory);

export default router;
