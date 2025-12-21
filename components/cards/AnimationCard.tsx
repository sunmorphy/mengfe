import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit3, Trash2 } from 'lucide-react'
import { Animation } from '@/types'

interface AnimationCardProps {
    animation: Animation
    onEdit: (animation: Animation) => void
    onDelete: (id: number) => void
}

export function AnimationCard({ animation, onEdit, onDelete }: AnimationCardProps) {
    return (
        <Card className="overflow-hidden">
            <div className="aspect-video bg-gray-100 relative">
                {/* Video count badge in top-right */}
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full backdrop-blur-sm z-10">
                    {animation.batch_video_path.length} video{animation.batch_video_path.length > 1 ? 's' : ''}
                </div>
                <video
                    src={animation.batch_video_path[0]}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => {
                        e.currentTarget.pause()
                        e.currentTarget.currentTime = 0
                    }}
                />
            </div>
            <CardContent className="p-4">
                <div className="flex justify-between mb-2">
                    <div className="flex flex-col">
                        <h3 className="font-medium text-md line-clamp-1 mb-1">
                            {animation.title}
                        </h3>
                        <p className="text-sm text-gray-600 line-clamp-2">
                            {animation.description || ''}
                        </p>
                    </div>
                </div>
                {animation.animation_categories && animation.animation_categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {animation.animation_categories.map((ac) => (
                            <span
                                key={ac.category.id}
                                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full text-xs"
                            >
                                {ac.category.name}
                            </span>
                        ))}
                    </div>
                )}
                <div className="flex items-center justify-between">
                    <div className="text-xs text-gray-500">
                        {new Date(animation.updated_at || animation.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onEdit(animation)} className="flex-1 sm:flex-none">
                            <Edit3 className="w-4 h-4 sm:mr-0 mr-2" />
                            <span className="sm:hidden">Edit</span>
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDelete(animation.id)} className="flex-1 sm:flex-none">
                            <Trash2 className="w-4 h-4 sm:mr-0 mr-2" />
                            <span className="sm:hidden">Delete</span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
