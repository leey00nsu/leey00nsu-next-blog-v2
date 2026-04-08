export interface ChatContactMethod {
  label: string
  url: string
}

export interface ChatContactProfile {
  title: string
  aboutUrl: string
  methods: ChatContactMethod[]
}
