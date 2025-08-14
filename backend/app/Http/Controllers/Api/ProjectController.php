<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ProjectController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Project::with(['user', 'bids.user']);

        // Search functionality
        if ($request->has('search')) {
            $search = $request->get('search');
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        // Category filter
        if ($request->has('category') && $request->get('category') !== 'All') {
            $query->where('category', $request->get('category'));
        }

        // Status filter
        if ($request->has('status')) {
            $query->where('status', $request->get('status'));
        }

        // Sorting
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        
        if ($sortBy === 'budget') {
            $query->orderBy('budget', $sortOrder);
        } else {
            $query->orderBy('created_at', $sortOrder);
        }

        $projects = $query->paginate(12);

        return response()->json($projects);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'category' => 'required|string',
            'skills' => 'required|array',
            'budget' => 'required|numeric|min:1',
            'deadline' => 'nullable|date|after:today',
            'images' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $project = Project::create([
            'user_id' => $request->user()->id,
            'title' => $request->title,
            'description' => $request->description,
            'category' => $request->category,
            'skills' => $request->skills,
            'budget' => $request->budget,
            'deadline' => $request->deadline,
            'images' => $request->images,
        ]);

        return response()->json([
            'message' => 'Project created successfully',
            'project' => $project->load(['user', 'bids.user'])
        ], 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Project $project)
    {
        return response()->json([
            'project' => $project->load(['user', 'bids.user', 'reviews.reviewer'])
        ]);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Project $project)
    {
        // Check if user owns the project
        if ($project->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'description' => 'sometimes|required|string',
            'category' => 'sometimes|required|string',
            'skills' => 'sometimes|required|array',
            'budget' => 'sometimes|required|numeric|min:1',
            'status' => 'sometimes|required|in:open,in_progress,completed,cancelled',
            'deadline' => 'nullable|date|after:today',
            'images' => 'nullable|array',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $project->update($request->only([
            'title', 'description', 'category', 'skills', 'budget', 
            'status', 'deadline', 'images'
        ]));

        return response()->json([
            'message' => 'Project updated successfully',
            'project' => $project->load(['user', 'bids.user'])
        ]);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Request $request, Project $project)
    {
        // Check if user owns the project
        if ($project->user_id !== $request->user()->id) {
            return response()->json([
                'message' => 'Unauthorized'
            ], 403);
        }

        // Only allow deletion if project is not in progress
        if ($project->status === 'in_progress') {
            return response()->json([
                'message' => 'Cannot delete project that is in progress'
            ], 400);
        }

        $project->delete();

        return response()->json([
            'message' => 'Project deleted successfully'
        ]);
    }
}
