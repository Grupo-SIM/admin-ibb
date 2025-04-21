"use client";
import React, { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Edit2, Upload, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { Button } from "../components/ui/global";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  zodResolver,
} from "@/components/ui/form";
import { Input } from "../components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Video0Create } from "@/services/category";
import { imageService } from "@/services/image";
import { VideoCategory, videoCategoryService } from "@/services/category";
import { useToast } from "@/hooks/use-toast";

export type VideoType =
  | "MINISTRACAO"
  | "TESTEMUNHO"
  | "DEVOCIONAL"
  | "PARA_FAMILIA";

export interface Video {
  id: string;
  title: string;
  videoId: string;
  thumb: string;
  type: VideoType;
  createdAt: string;
}

type ModalMode = "create" | "edit" | "delete";

interface VideoModalProps {
  video?: Video | null;
  onSuccess?: () => void;
  mode?: ModalMode;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

const extractYouTubeId = (input: string): string => {
  // Check if the input is a URL
  try {
    const url = new URL(input);
    // Handle youtube.com and youtu.be URLs
    if (url.hostname.includes("youtube.com")) {
      return url.searchParams.get("v") || input;
    } else if (url.hostname === "youtu.be") {
      return url.pathname.slice(1); // Remove the leading slash
    }
  } catch {
    // If input is not a URL, assume it's already a video ID
    return input;
  }
  return input;
};

const videoFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  videoId: z
    .string()
    .min(1, "Video ID is required")
    .transform(extractYouTubeId),
  categoryVideoId: z.string().min(1, "Category is required"),
});

type VideoFormValues = z.infer<typeof videoFormSchema>;

const VideoModal: React.FC<VideoModalProps> = ({
  video = null,
  onSuccess,
  mode = "create",
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    video?.thumb || null
  );
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<VideoCategory[]>([]);

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoFormSchema),
    defaultValues: {
      title: video?.title || "",
      videoId: video?.videoId || "",
    },
  });

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await videoCategoryService.getAllCategories();
      setCategories(response.data);
      form.setValue("categoryVideoId", response.data[0]?.id || "");
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

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (data: VideoFormValues): Promise<void> => {
    try {
      setLoading(true);

      const videoData = {
        ...data,
      };

      if (mode === "create") {
        await videoCategoryService.createVideo(videoData);
      } else if (mode === "delete" && video?.id) {
        await videoCategoryService.deleteVideo(video.id);
      }

      onSuccess?.();
      setOpen(false);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderTriggerButton = (): JSX.Element => {
    if (mode === "create") {
      return (
        <Button variant="default" className="gap-2">
          <Plus size={16} />
          Add Video
        </Button>
      );
    } else if (mode === "delete") {
      return (
        <Button variant="destructive" size="icon">
          <Trash2 size={16} />
        </Button>
      );
    } else {
      return (
        <Button variant="ghost" size="icon">
          <Edit2 size={16} />
        </Button>
      );
    }
  };

  const renderTitle = (): string => {
    if (mode === "create") return "Add New Video";
    if (mode === "delete") return "Delete Video";
    return "Edit Video";
  };

  const renderContent = (): JSX.Element => {
    if (mode === "delete") {
      return (
        <div className="space-y-4">
          <p>Você tem certeza que quer deletar este video?</p>
          <p className="font-medium">{video?.title}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleSubmit(form.getValues())}
              disabled={loading}
            >
              {loading ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
      );
    }

    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="videoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>YouTube Video ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="categoryVideoId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{renderTriggerButton()}</DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{renderTitle()}</DialogTitle>
        </DialogHeader>
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
};

export default VideoModal;

import { Textarea } from "@/components/ui/textarea";

interface PostModalProps {
  mode: "create" | "edit";
  onSuccess: () => void;
  onImageUpload: (file: File) => Promise<string>;
  createPost: (data: {
    title: string;
    description?: string;
    thumbnail?: string;
    link?: string;
    categoryPostId: string;
  }) => Promise<any>;
  categoryId?: string;
}


interface Category {
  id: string;
  name: string;
}

interface PostModalProps {
  mode: "create" | "edit";
  onSuccess: () => void;
  onImageUpload: (file: File) => Promise<string>;
  createPost: (data: {
    title: string;
    description?: string;
    thumbnail?: string;
    link?: string;
    categoryPostId: string;
  }) => Promise<any>;
  categoryId?: string;
}

const PostModal: React.FC<PostModalProps> = ({
  mode,
  onSuccess,
  onImageUpload,
  createPost,
  categoryId: defaultCategoryId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultCategoryId || "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string>("");
  const { toast } = useToast();

  const fetchCategories = async () => {
    try {
      const response = await fetch('https://api-bosque.jbmidia.com/post-category');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data.data);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load categories",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchCategories();
    }
  }, [isOpen]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLink("");
    setSelectedCategoryId(defaultCategoryId || "");
    setThumbnailFile(null);
    setThumbnailPreview("");
    setIsLoading(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Error",
          description: "Please upload an image file",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Error",
          description: "Image size should be less than 5MB",
          variant: "destructive",
        });
        return;
      }

      setThumbnailFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCategoryId) {
      toast({
        title: "Error",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    if (!title.trim()) {
      toast({
        title: "Error",
        description: "Title is required",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      let thumbnailUrl = "";
      if (thumbnailFile) {
        thumbnailUrl = await onImageUpload(thumbnailFile);
      }

      await createPost({
        title: title.trim(),
        description: description.trim() || undefined,
        thumbnail: thumbnailUrl || undefined,
        link: link.trim() || undefined,
        categoryPostId: selectedCategoryId,
      });

      toast({
        title: "Success",
        description: "Post created successfully!",
      });

      setIsOpen(false);
      resetForm();
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create post",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Post
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Post</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="category" className="block text-sm font-medium mb-1">
              Category *
            </label>
            <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
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

          <div>
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter post title"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter post description"
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="link" className="block text-sm font-medium mb-1">
              Link
            </label>
            <Input
              id="link"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="Enter post link"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Thumbnail</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md">
              {thumbnailPreview ? (
                <div className="relative">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="max-h-40 rounded"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setThumbnailFile(null);
                      setThumbnailPreview("");
                    }}
                    className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full transform translate-x-1/2 -translate-y-1/2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="space-y-1 text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="flex text-sm text-gray-600">
                    <label
                      htmlFor="thumbnail"
                      className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500"
                    >
                      <span>Upload a file</span>
                      <input
                        id="thumbnail"
                        name="thumbnail"
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageChange}
                        disabled={isLoading}
                      />
                    </label>
                    <p className="pl-1">or drag and drop</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, WEBP up to 5MB
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false);
                resetForm();
              }}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                "Create Post"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export { PostModal };