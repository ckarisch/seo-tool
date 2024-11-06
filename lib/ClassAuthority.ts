export class ClassAuthority {
    private classes: (string | false | undefined | null)[];

    constructor(classes: (string | false | undefined | null)[]) {
        this.classes = classes;
    }

    get value(): string {
        return this.classes
            .filter(Boolean)
            .join(' ')
            .trim();
    }

    add(className: string | false | undefined | null): ClassAuthority {
        this.classes.push(className);
        return this;
    }

    toString(): string {
        return this.value;
    }
}