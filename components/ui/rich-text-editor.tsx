'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { Bold, Italic, Underline as UnderlineIcon, List, ListOrdered, Quote, Link as LinkIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react'
import { Button } from './button'
import { useCallback, useState, useEffect } from 'react'

interface RichTextEditorProps {
  value?: string
  onChange?: (html: string) => void
  placeholder?: string
  className?: string
}

interface MenuBarProps {
  editor: ReturnType<typeof useEditor> | null
}

function MenuBar({ editor }: MenuBarProps) {
  const [, forceUpdate] = useState({})

  useEffect(() => {
    if (!editor) return

    const update = () => {
      forceUpdate({})
    }

    editor.on('selectionUpdate', update)
    editor.on('transaction', update)

    return () => {
      editor.off('selectionUpdate', update)
      editor.off('transaction', update)
    }
  }, [editor])

  const setLink = useCallback(() => {
    if (!editor) return
    
    const previousUrl = editor.getAttributes('link').href
    const url = window.prompt('URL', previousUrl)

    // cancelled
    if (url === null) {
      return
    }

    // empty
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    // update link
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="border-b border-gray-200 p-2 flex flex-wrap gap-1">
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('bold') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className="h-8 w-8 p-0"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('italic') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className="h-8 w-8 p-0"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('underline') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className="h-8 w-8 p-0"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-gray-300 mx-1" />
      
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('bulletList') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="h-8 w-8 p-0"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('orderedList') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className="h-8 w-8 p-0"
      >
        <ListOrdered className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('blockquote') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className="h-8 w-8 p-0"
      >
        <Quote className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-gray-300 mx-1" />
      
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('link') ? 'default' : 'outline'}
        onClick={setLink}
        className="h-8 w-8 p-0"
      >
        <LinkIcon className="h-4 w-4" />
      </Button>
      
      <div className="w-px h-6 bg-gray-300 mx-1" />
      
      <Button
        type="button"
        size="sm"
        variant={editor.isActive({ textAlign: 'start' }) || (!editor.isActive({ textAlign: 'center' }) && !editor.isActive({ textAlign: 'right' }) && !editor.isActive({ textAlign: 'justify' })) ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().setTextAlign('start').run()}
        className="h-8 w-8 p-0"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className="h-8 w-8 p-0"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className="h-8 w-8 p-0"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

export default function RichTextEditor({ 
  value = '', 
  onChange, 
  placeholder = 'Enter text...', 
  className = '' 
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'start',
      }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      onChange?.(html)
    },
    immediatelyRender: false,
  })

  return (
    <div className={`border border-gray-300 rounded-md flex flex-col ${className}`}>
      <MenuBar editor={editor} />
      <div className="relative flex-1">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none p-3 min-h-[120px] h-full focus-within:outline-none [&_.ProseMirror]:focus:outline-none [&_.ProseMirror]:focus:ring-0 [&_.ProseMirror]:focus:border-transparent [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_li]:list-item [&_.ProseMirror_blockquote]:border-l-4 [&_.ProseMirror_blockquote]:border-gray-300 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-gray-600 [&_.ProseMirror_blockquote]:my-4"
        />
        {!editor?.getText() && (
          <div className="absolute top-3 left-3 text-gray-400 pointer-events-none select-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  )
}