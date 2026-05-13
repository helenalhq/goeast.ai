type SuggestedQuestion = {
  label: string;
  question: string;
};

const SUGGESTED_QUESTIONS: Record<string, SuggestedQuestion[]> = {
  "prologue-zhougong": [
    { label: "What is the I Ching?", question: "How does the I Ching encode the patterns of change, and can it really predict the future?" },
    { label: "What is a dream?", question: "You are known as the interpreter of dreams. What is the relationship between dreams and reality?" },
    { label: "Why did you create rites?", question: "You helped build the rites and music of an entire civilization. Why was ritual so important?" },
  ],
  "ch01-laozi": [
    { label: "What is the Tao?", question: "You wrote that the Tao that can be told is not the eternal Tao. Then how can anyone understand it?" },
    { label: "What is wu wei?", question: "You teach non-action, wu wei. Does that mean we should simply do nothing? How does doing nothing accomplish anything?" },
    { label: "Why is water powerful?", question: "You say the highest good is like water. What makes water such a powerful metaphor for living well?" },
  ],
  "ch02-confucius": [
    { label: "What is ren?", question: "You speak constantly of ren, humaneness. What exactly is it, and how does one cultivate it?" },
    { label: "Why do rituals matter?", question: "You placed enormous importance on li, ritual and propriety. Why do ceremonies and etiquette matter so much?" },
    { label: "How should one learn?", question: "You said learning without thought is dangerous, and thought without learning is empty. What is the right balance?" },
  ],
  "ch03-sunzi": [
    { label: "How to win without fighting?", question: "You say the supreme art of war is to subdue the enemy without fighting. Is that really possible?" },
    { label: "Know yourself?", question: "You wrote 'know yourself and know your enemy.' Which is harder, and why do most people fail at one?" },
    { label: "Is war ever justified?", question: "You wrote the greatest book on warfare, yet you seem to oppose war. When is fighting justified?" },
  ],
  "ch04-zhuangzi": [
    { label: "Are you the butterfly?", question: "Your butterfly dream is famous. Do you believe reality is an illusion? How can we know what is real?" },
    { label: "What is true freedom?", question: "You seem to reject all rules and conventions. What does true freedom look like in daily life?" },
    { label: "Usefulness of uselessness", question: "You told the story of the useless tree that outlived all useful ones. What does that teach us about value?" },
  ],
  "ch05-mencius": [
    { label: "Is human nature good?", question: "You argue that human nature is inherently good. But what about cruelty and evil? How do you explain those?" },
    { label: "What are the four sprouts?", question: "You describe four moral sprouts in every human heart. What are they, and how do they grow?" },
    { label: "People over rulers?", question: "You said the people are most important, the state next, and the ruler last. Was that dangerous to say?" },
  ],
  "ch06-mozi": [
    { label: "Why universal love?", question: "You teach that we should love everyone equally. But isn't it natural to love your own family more?" },
    { label: "Can war be prevented?", question: "You were both a military engineer and a pacifist. How did you reconcile building defenses with opposing war?" },
    { label: "Against Confucius?", question: "You directly challenged Confucius's teachings on graded love and elaborate rituals. What was your strongest objection?" },
  ],
  "ch07-zhuxi": [
    { label: "What is ge wu?", question: "Your central practice is ge wu, investigating things. How does studying a bamboo stalk lead to understanding the universe?" },
    { label: "Where is principle?", question: "You say everything contains li, principle. Is principle inside things, or outside them? Where does it come from?" },
    { label: "Knowledge vs action?", question: "You insist knowledge must precede action. Wang Yangming later argued they are one. What would you say to him?" },
  ],
  "ch08-zhangzai": [
    { label: "What is qi?", question: "You propose that everything, including you and me and the stars, is made of qi. What exactly is qi?" },
    { label: "The four vows?", question: "Your four vows are famous. Which of them was hardest for you to live up to?" },
    { label: "Heaven and earth?", question: "What does it mean to set your heart for heaven and earth? Is that not impossibly ambitious?" },
  ],
  "ch09-huineng": [
    { label: "Originally nothing?", question: "Your famous verse says 'originally there is not a single thing.' If nothing exists, what is this conversation?" },
    { label: "Enlightenment without study?", question: "You could not read, yet you became the greatest Zen master. Is studying the scriptures actually an obstacle?" },
    { label: "What is Zen?", question: "If Zen is not about meditation or sutras, what is it? How do you practice it in everyday life?" },
  ],
  "ch10-wangyangming": [
    { label: "Knowledge and action as one?", question: "You say knowing and doing are the same thing. But I know I should exercise and I don't. How is that not a contradiction?" },
    { label: "What happened at Longchang?", question: "Your enlightenment happened in exile at Longchang. What exactly did you realize in that moment?" },
    { label: "Mind is principle?", question: "You argue that principle is in the mind, not in things. Does that mean truth is subjective?" },
  ],
};

export function getSuggestedQuestions(slug: string): SuggestedQuestion[] {
  return SUGGESTED_QUESTIONS[slug] || [];
}
