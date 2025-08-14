'use client'

import { motion } from 'framer-motion'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import { StarIcon } from '@heroicons/react/24/solid'
import Image from 'next/image'

const testimonials = [
  {
    name: 'Sarah Chen',
    role: 'Startup Founder',
    company: 'TechFlow',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
    content: 'ALPHA revolutionized how we hire developers. The AI matching is incredible, and the blockchain payments give us complete transparency and security.',
    rating: 5
  },
  {
    name: 'Marcus Rodriguez',
    role: 'Full-Stack Developer',
    company: 'Freelancer',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    content: 'As a developer, ALPHA has been a game-changer. The project breakdowns help me understand requirements better, and crypto payments are instant.',
    rating: 5
  },
  {
    name: 'Emily Watson',
    role: 'Product Manager',
    company: 'InnovateCorp',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
    content: 'The quality of talent on ALPHA is outstanding. The dispute resolution system is fair and the AI project analysis saves us so much time.',
    rating: 5
  },
  {
    name: 'David Kim',
    role: 'Blockchain Developer',
    company: 'CryptoBuilders',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    content: 'Finally, a platform that understands Web3. The smart contracts for escrow are bulletproof, and the community is top-notch.',
    rating: 5
  },
  {
    name: 'Lisa Park',
    role: 'Design Director',
    company: 'CreativeStudio',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
    content: 'ALPHA connects me with clients who truly value quality design. The payment system is seamless and the project management tools are excellent.',
    rating: 5
  },
  {
    name: 'Alex Thompson',
    role: 'CTO',
    company: 'ScaleUp Inc',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
    content: 'We\'ve completed 15+ projects through ALPHA. The talent quality is consistently high and the blockchain infrastructure gives us confidence.',
    rating: 5
  }
]

export default function Testimonials() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true })

  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            What Our Community Says
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of satisfied clients and freelancers who trust ALPHA for their projects
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <Image
                  src={testimonial.avatar}
                  alt={testimonial.name}
                  width={48}
                  height={48}
                  className="rounded-full mr-4"
                />
                <div>
                  <h4 className="font-semibold text-gray-900">{testimonial.name}</h4>
                  <p className="text-sm text-gray-600">{testimonial.role} at {testimonial.company}</p>
                </div>
              </div>
              
              <div className="flex mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <StarIcon key={i} className="h-5 w-5 text-yellow-400" />
                ))}
              </div>
              
              <p className="text-gray-700 leading-relaxed">
                "{testimonial.content}"
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}