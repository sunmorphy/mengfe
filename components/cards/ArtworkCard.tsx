import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit3, Trash2 } from 'lucide-react'
import { Artwork, Category } from '@/types'

interface ArtworkCardProps {
    artwork: Artwork
    onEdit: (artwork: Artwork) => void
    onDelete: (id: number) => void
}

export function ArtworkCard({ artwork, onEdit, onDelete }: ArtworkCardProps) {
    return (
        <Card className="overflow-hidden">
            <div className="aspect-square bg-gray-100 relative">
                <img
                    src={artwork.image_path}
                    alt={artwork.title || 'Untitled'}
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
                                {artwork.title || 'Untitled'}
                            </h3>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${artwork.type === 'portfolio'
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-purple-100 text-purple-700'
                                }`}>
                                {artwork.type}
                            </span>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2">
                            {artwork.description || ''}
                        </p>
                    </div>
                </div>
                {artwork.artwork_categories && artwork.artwork_categories.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                        {artwork.artwork_categories.map((ac) => (
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
                        {new Date(artwork.updated_at || artwork.created_at).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => onEdit(artwork)} className="flex-1 sm:flex-none">
                            <Edit3 className="w-4 h-4 sm:mr-0 mr-2" />
                            <span className="sm:hidden">Edit</span>
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDelete(artwork.id)} className="flex-1 sm:flex-none">
                            <Trash2 className="w-4 h-4 sm:mr-0 mr-2" />
                            <span className="sm:hidden">Delete</span>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
