"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // Seed Bloom Levels
    const bloomLevels = [
        { name: 'Remember', level: 1, description: 'Recall facts and basic concepts' },
        { name: 'Understand', level: 2, description: 'Explain ideas or concepts' },
        { name: 'Apply', level: 3, description: 'Use information in new situations' },
        { name: 'Analyze', level: 4, description: 'Draw connections among ideas' },
        { name: 'Evaluate', level: 5, description: 'Justify a decision or course of action' },
        { name: 'Create', level: 6, description: 'Produce new or original work' },
    ];
    for (const bl of bloomLevels) {
        await prisma.bloomLevel.upsert({
            where: { name: bl.name },
            update: {},
            create: bl,
        });
    }
    console.log('✅ Bloom levels seeded');
    // Seed ML Topics
    const topics = [
        { name: 'Linear Regression', slug: 'linear-regression', order: 1, description: 'Predicting continuous values using linear relationships' },
        { name: 'Clustering', slug: 'clustering', order: 2, description: 'Grouping similar data points together' },
        { name: 'Decision Trees', slug: 'decision-trees', order: 3, description: 'Tree-based models for classification and regression' },
        { name: 'Deep Learning', slug: 'deep-learning', order: 4, description: 'Neural networks with multiple layers' },
        { name: 'K-Nearest Neighbours', slug: 'k-nearest-neighbours', order: 5, description: 'Instance-based learning algorithm' },
        { name: 'Supervised Learning', slug: 'supervised-learning', order: 6, description: 'Learning from labeled data' },
        { name: 'Unsupervised Learning', slug: 'unsupervised-learning', order: 7, description: 'Learning patterns from unlabeled data' },
        { name: 'Neural Networks', slug: 'neural-networks', order: 8, description: 'Brain-inspired computing models' },
        { name: 'Support Vector Machines', slug: 'support-vector-machines', order: 9, description: 'Classification using hyperplanes' },
        { name: 'Ensemble Methods', slug: 'ensemble-methods', order: 10, description: 'Combining multiple models for better predictions' },
    ];
    for (const topic of topics) {
        await prisma.topic.upsert({
            where: { slug: topic.slug },
            update: {},
            create: topic,
        });
    }
    console.log('✅ Topics seeded');
    // Seed Sample Questions
    const linearRegression = await prisma.topic.findUnique({ where: { slug: 'linear-regression' } });
    const remember = await prisma.bloomLevel.findUnique({ where: { level: 1 } });
    if (linearRegression && remember) {
        const sampleQuestions = [
            {
                topicId: linearRegression.id,
                bloomLevelId: remember.id,
                questionText: 'What is the primary goal of linear regression?',
                questionType: 'MCQ',
                options: [
                    { text: 'To classify data into categories', isCorrect: false },
                    { text: 'To predict a continuous target variable', isCorrect: true },
                    { text: 'To cluster similar data points', isCorrect: false },
                    { text: 'To reduce dimensionality', isCorrect: false },
                ],
                explanation: 'Linear regression is used to predict continuous values based on one or more input features.',
                difficulty: 2,
                source: 'MANUAL',
            },
            {
                topicId: linearRegression.id,
                bloomLevelId: remember.id,
                questionText: 'In the equation y = mx + b, what does "m" represent?',
                questionType: 'MCQ',
                options: [
                    { text: 'The y-intercept', isCorrect: false },
                    { text: 'The slope of the line', isCorrect: true },
                    { text: 'The error term', isCorrect: false },
                    { text: 'The predicted value', isCorrect: false },
                ],
                explanation: 'In linear regression, m represents the slope which indicates how much y changes for a unit change in x.',
                difficulty: 1,
                source: 'MANUAL',
            },
            {
                topicId: linearRegression.id,
                bloomLevelId: remember.id,
                questionText: 'Which metric is commonly used to evaluate linear regression models?',
                questionType: 'MCQ',
                options: [
                    { text: 'Accuracy', isCorrect: false },
                    { text: 'F1 Score', isCorrect: false },
                    { text: 'Mean Squared Error (MSE)', isCorrect: true },
                    { text: 'AUC-ROC', isCorrect: false },
                ],
                explanation: 'MSE measures the average squared difference between predicted and actual values.',
                difficulty: 2,
                source: 'MANUAL',
            },
        ];
        for (const q of sampleQuestions) {
            await prisma.question.create({ data: q });
        }
        console.log('✅ Sample questions seeded');
    }
    console.log('🎉 Database seeding completed!');
}
main()
    .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map