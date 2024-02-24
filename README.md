
Dark Mode
Implemented using Svelte's reactive features, the dark mode functionality toggles between light and dark themes by dynamically adding or removing the "dark" class from the <body>. This class modifies the background color and text color to provide an optimal viewing experience in different lighting conditions.

Tab Navigation
The tab navigation feature allows users to switch between different sections of the page by clicking on the corresponding tab. This is achieved by using Svelte's reactive variables to track the active tab and conditionally render the content based on the selected tab.
This enhancement was applied to the resume page, where the user can switch between "Experience" and "Education" sections without reloading the page.

Contact Form
Integrated a contact form component using Svelte's form handling capabilities. The form captures user input for name, email, and message fields. Upon submission, form data is validated to ensure completeness before being submitted.

Testimonials Carousel
Implemented a testimonials carousel using Svelte's reactive variables to track the active testimonial and conditionally render the content based on the selected testimonial. This feature allows users to view multiple testimonials in a single section, with the ability to navigate between them using the carousel controls. The testimonials presented are just placeholders and can be replaced with real testimonials.

Languages Section
Utilized Svelte's component-based architecture to create separate components for displaying language proficiency. Data for languages are passed as props to these components, which then renders a chart based on the provided data.


