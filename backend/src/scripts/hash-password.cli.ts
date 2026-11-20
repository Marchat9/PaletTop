import { createInterface } from 'readline';
import { runHashPassword } from './hash-password';

/** Reads a line without echoing it, so the password stays out of the screen and shell history. */
function promptHidden(): Promise<string> {
    return new Promise((resolve) => {
        const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
        process.stdout.write('Password: ');
        // readline has no public "mute" option: silence its echo while the line is typed.
        (rl as unknown as { _writeToOutput: (text: string) => void })._writeToOutput = () =>
            undefined;
        let answered = false;
        rl.question('', (answer) => {
            answered = true;
            rl.close();
            process.stdout.write('\n');
            resolve(answer);
        });
        // Ctrl+C or end of input before any line: resolve empty, so the usage is printed.
        rl.on('close', () => {
            if (!answered) resolve('');
        });
    });
}

// CLI output on purpose (not the Nest Logger): the hash must be printed alone to be copied.
void runHashPassword(process.argv.slice(2), promptHidden, (line) =>
    process.stdout.write(`${line}\n`),
).then((exitCode) => {
    process.exitCode = exitCode;
});
