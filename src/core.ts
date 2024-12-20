// It's don't work properly without transformer!!!

type Ctor = new (...args: never[]) => object & { start?(): void };

const CONSTRUCTORS = new Map<string, Ctor>();
const INSTANCES = new Map<string, object & { start?(): void }>();

const RUN_SERVICE = game.GetService("RunService");

export const Provider = (ctor: Ctor) => {
	if (!RUN_SERVICE.IsServer()) error("Provider can be created only from server")

	const name = tostring(ctor);
	if (CONSTRUCTORS.has(name)) error(`Provider ${name} already registered`);

	CONSTRUCTORS.set(name, ctor);
};

export const Service = (ctor: Ctor) => {
	if (!RUN_SERVICE.IsClient()) error("Service can be created only from client")
	
	const name = tostring(ctor);
	if (CONSTRUCTORS.has(name)) error(`Service ${name} already registered`);

	CONSTRUCTORS.set(name, ctor);
};

export const Inject = (property: object, name: string) => {};

// Start

export function coreStart() {
	const promises: Promise<void>[] = [];
	CONSTRUCTORS.forEach((ctor, name) =>
		promises.push(
			new Promise<void>((resolve) => {
				INSTANCES.set(name, new ctor());
				resolve();
			}),
		),
	);

	Promise.all(promises).then(() => {
		INSTANCES.forEach((instance) => {
			const injections = (instance as { injections: string[] }).injections;

			if (injections) {
				injections.forEach((metadata) => {
					const array = metadata.split("#");

					const fieldName = array[0];
					const dependencyName = array[1];

					if (fieldName && dependencyName) {
						const dependency = INSTANCES.get(dependencyName);
						if (dependency) {
							(instance as { [key: string]: unknown })[fieldName] = dependency as never;
						}
					}
				});
			}
		});

		INSTANCES.forEach(async (instance) => (instance.start !== undefined ? instance.start() : undefined));
	});
}
