import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
    let strategy: JwtStrategy;

    beforeEach(() => {
        process.env.JWT_SECRET = 'test-secret';

        strategy = new JwtStrategy();
    });

    describe('validate', () => {
        it('should return the authenticated user from the JWT payload', async () => {
            const payload = {
                sub: 'user-id',
                email: 'test@finbuddy.dev',
            };

            const result = await strategy.validate(payload);

            expect(result).toEqual({
                id: 'user-id',
                email: 'test@finbuddy.dev',
            });
        });
    });
});