export type Testimonial = {
  name: string;
  location: string;
  rating: number;
  quote: string;
  /** True for the placeholder reviews below. The home page labels them as samples. */
  sample?: boolean;
};

/**
 * Home page reviews. These are SAMPLE placeholders so the layout has content.
 * Replace them with real customer reviews before launch, or empty the array
 * to hide the section. Never publish invented reviews as real ones.
 */
export const testimonials: Testimonial[] = [
  {
    name: "Sample customer",
    location: "Your city",
    rating: 5,
    quote:
      "Ordered the tote bag on Tuesday, had it on my porch Thursday. Build quality is exactly what I was hoping for.",
    sample: true,
  },
  {
    name: "Sample customer",
    location: "Your city",
    rating: 5,
    quote: "Checkout was fast and the packaging was clean and simple, just as promised. I'll be back.",
    sample: true,
  },
  {
    name: "Sample customer",
    location: "Your city",
    rating: 5,
    quote:
      "Quality of the mug and notebook set is a step above what I expected for the price. Nice small details.",
    sample: true,
  },
];
