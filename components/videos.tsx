"use client";
import React, { useState, useEffect } from "react";
import { Plus, Trash2, Upload } from "lucide-react";
import { Card, Badge, Button, CardContent } from "@/components/ui/global";
import { useToast } from "@/hooks/use-toast";
import { PostModal } from "./modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Post {
  id: string;
  title: string;
  description?: string;
  thumbnail?: string;
  link?: string;
  categoryPostId: string;
  category: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

const PostCategories = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        "https://api-bosque.jbmidia.com/post-category"
      );
      if (!response.ok) throw new Error("Failed to fetch categories");
      const data = await response.json();
      setCategories(data.data);
      if (data.data.length > 0 && !selectedCategory) {
        setSelectedCategory(data.data[0]);
        fetchPostsForCategory(data.data[0].id);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPostsForCategory = async (categoryId: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://api-bosque.jbmidia.com/post/category/${categoryId}/post`
      );
      if (!response.ok) throw new Error("Failed to fetch posts");
      const data = await response.json();
      setPosts(data.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load posts for this category",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        "https://api-bosque.jbmidia.com/images/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to upload image");
      }

      const data = await response.json();
      return "https://api-bosque.jbmidia.com" + data.url;
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
      throw error;
    }
  };

  const createPost = async (postData: {
    title: string;
    description?: string;
    thumbnail?: string;
    link?: string;
    categoryPostId: string;
  }) => {
    const response = await fetch("https://api-bosque.jbmidia.com/post", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const a = await response.json();
      console.log(a);
      throw new Error("Failed to create post");
    }

    return await response.json();
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    if (category) {
      setSelectedCategory(category);
      fetchPostsForCategory(categoryId);
    }
  };

  const handleDeletePost = async (id: string, thumbnailUrl?: string) => {
    if (confirm("Are you sure you want to delete this post?")) {
      try {
        // Delete post
        const response = await fetch(
          `https://api-bosque.jbmidia.com/post/${id}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) throw new Error("Failed to delete post");

        // Delete associated image if exists
        if (thumbnailUrl) {
          const filename = thumbnailUrl.split("/").pop();
          if (filename) {
            await fetch(`https://api-bosque.jbmidia.com/images/${filename}`, {
              method: "DELETE",
            });
          }
        }

        toast({
          title: "Success",
          description: "Post deleted successfully!",
        });
        if (selectedCategory) {
          fetchPostsForCategory(selectedCategory.id);
        }
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete post",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0 mb-6">
        <div className="w-full sm:w-64">
          <Select
            value={selectedCategory?.id}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <PostModal
          mode="create"
          onSuccess={() =>
            fetchPostsForCategory(selectedCategory?.id as string)
          }
          onImageUpload={handleImageUpload}
          createPost={createPost}
          categoryId={selectedCategory?.id}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        {posts.map((post) => (
          <Card key={post.id}>
            <div className="relative aspect-video bg-gray-100">
              {post.thumbnail ? (
                <img
                  src={post.thumbnail}
                  alt={post.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center w-full h-full">
                  <Upload className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-semibold text-sm line-clamp-2">
                  {post.title}
                </h3>
                <Badge variant="outline">{selectedCategory?.name}</Badge>
              </div>
              {post.description && (
                <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                  {post.description}
                </p>
              )}
              {post.link && (
                <a
                  href={post.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 mt-2 block truncate"
                >
                  {post.link}
                </a>
              )}
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePost(post.id, post.thumbnail)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading && (
        <div className="flex justify-center items-center h-40">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
    </>
  );
};

export default PostCategories;
