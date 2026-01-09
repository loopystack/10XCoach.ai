const express = require('express');
const router = express.Router();
const prisma = require('../../lib/prisma');
const { optionalAuth } = require('../../middleware/auth.middleware');

// =============================================
// GET /api/blogs
// Get all published blog posts
// =============================================
router.get('/blogs', optionalAuth, async (req, res) => {
  try {
    const { page, limit } = req.query;
    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 6;
    const skip = (pageNum - 1) * limitNum;

    const where = {};
    
    // Non-admin users only see published posts
    if (!req.user || req.user.role !== 'ADMIN') {
      where.published = true;
    }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: [
          { order: 'asc' },
          { createdAt: 'desc' }
        ],
        skip,
        take: limitNum
      }),
      prisma.blogPost.count({ where })
    ]);

    res.json({
      posts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error('Get blogs error:', error);
    res.status(500).json({ error: 'Failed to get blog posts' });
  }
});

// =============================================
// GET /api/blogs/:id
// Get single blog post by ID
// =============================================
router.get('/blogs/:id', optionalAuth, async (req, res) => {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: parseInt(req.params.id) }
    });

    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    // Non-admin users can't see unpublished posts
    if (!post.published && (!req.user || req.user.role !== 'ADMIN')) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Get blog post error:', error);
    res.status(500).json({ error: 'Failed to get blog post' });
  }
});

module.exports = router;

