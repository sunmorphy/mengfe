import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit3, Trash2 } from 'lucide-react'
import { Project } from '@/types'

interface ProjectCardProps {
    project: Project
    onEdit: (project: Project) => void
    onDelete: (id: number) => void
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
    return (
        <Card className="overflow-hidden">
            <div className="aspect-video bg-gray-100 relative">
                {/* Image count badge in top-right */}
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
                    {project.batch_image_path.length} image{project.batch_image_path.length > 1 ? 's' : ''}
                </div>
                <img
                    src={project.batch_image_path[0]}
                    alt={project.title}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                        e.currentTarget.src = '/placeholder-image.svg'
                    }}
                />
            </div>
            <CardContent className="p-4">
                <div className="flex justify-between mb-2">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-medium text-md line-clamp-1">
                                {project.title}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${project.type === 'portfolio'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                {project.type}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                            {project.description || ''}
                        </p>
                    </div>
                </div>
                {project.project_categories && project.project_categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {project.project_categories.map((pc) => (
                            <span
                                key={pc.category.id}
                                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                            >
                                {pc.category.name}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        {new Date(project.updated_at || project.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onEdit(project)} className="flex-1 sm:flex-none">
                            <Edit3 className="w-4 h-4 sm:mr-0 mr-2" />
                            <span className="sm:hidden">Edit</span>
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDelete(project.id)} className="flex-1 sm:flex-none">
                            <Trash2 className="w-4 h-4 sm:mr-0 mr-2" />
                            <span className="sm:hidden">Delete</span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
