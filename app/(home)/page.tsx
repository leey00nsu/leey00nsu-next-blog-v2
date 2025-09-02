import { PostList } from '@/widgets/post/ui/post-list'

const MOCK_POSTS = [
  {
    id: '1',
    writer: 'John Doe',
    date: '2023-01-01',
    title: 'Post 1',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin non suscipit mi. Etiam purus nisi, elementum sed ex viverra, rhoncus condimentum diam. Nunc bibendum erat vitae sapien auctor ullamcorper. Sed massa dolor, euismod eget sapien eget, dictum finibus felis. Nulla leo sem, semper ut purus quis, scelerisque vulputate massa. Nulla posuere erat tellus, non tempor lacus tristique sit amet. Curabitur placerat egestas odio a porta. Phasellus dolor elit, tristique id mauris vel, egestas scelerisque nulla.',
    image: 'https://via.placeholder.com/150',
    likes: 0,
  },
  {
    id: '2',
    writer: 'John Doe',
    date: '2023-01-01',
    title: 'Post 2',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin non suscipit mi. Etiam purus nisi, elementum sed ex viverra, rhoncus condimentum diam. Nunc bibendum erat vitae sapien auctor ullamcorper. Sed massa dolor, euismod eget sapien eget, dictum finibus felis. Nulla leo sem, semper ut purus quis, scelerisque vulputate massa. Nulla posuere erat tellus, non tempor lacus tristique sit amet. Curabitur placerat egestas odio a porta. Phasellus dolor elit, tristique id mauris vel, egestas scelerisque nulla.',
    image: 'https://via.placeholder.com/150',
    likes: 0,
  },
  {
    id: '3',
    writer: 'John Doe',
    date: '2023-01-01',
    title: 'Post 3',
    content:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin non suscipit mi. Etiam purus nisi, elementum sed ex viverra, rhoncus condimentum diam. Nunc bibendum erat vitae sapien auctor ullamcorper. Sed massa dolor, euismod eget sapien eget, dictum finibus felis. Nulla leo sem, semper ut purus quis, scelerisque vulputate massa. Nulla posuere erat tellus, non tempor lacus tristique sit amet. Curabitur placerat egestas odio a porta. Phasellus dolor elit, tristique id mauris vel, egestas scelerisque nulla.',
    image: 'https://via.placeholder.com/150',
    likes: 0,
  },
]

export default function Home() {
  return <PostList posts={MOCK_POSTS} />
}
