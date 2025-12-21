import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Edit3, Trash2 } from 'lucide-react'
import { Category } from '@/types'

interface CategoryCardProps {
    category: Category
    onEdit: (category: Category) => void
    onDelete: (id: number) => void
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-md line-clamp-1 mb-1">
                            {category.name}
                        </h3>
                        <div className="text-xs text-gray-500">
                            Created: {new Date(category.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                            })}
                        </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline" onClick={() => onEdit(category)}>
                            <Edit3 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => onDelete(category.id)}>
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
