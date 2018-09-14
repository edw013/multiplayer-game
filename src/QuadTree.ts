import GameObject from "./GameObject";
import { Bounds } from "./common/Utilities";

// used for better collision checking
class QuadTree {
    private root: Node;

    public constructor(bounds: Bounds, maxObjects: number, maxLevels: number) {
        let node: Node = new Node(bounds, 0, maxObjects, maxLevels);

        this.root = node;
    }

    public insert(item: GameObject) {
        this.root.insert(item);
    }

    public clear() {
        this.root.clear();
    }

    public get(item: GameObject): GameObject[] {
        return this.root.get(item).slice(0);
    }

}

class Node {
    private bounds: Bounds;
    private maxObjects: number;
    private maxLevels: number;
    private level: number;
    private objects: GameObject[];
    private nodes: Node[];

    public constructor(bounds: Bounds, level: number, maxObjects: number, maxLevels: number) {
        this.bounds = bounds;
        this.level = level;
        this.maxObjects = maxObjects;
        this.maxLevels = maxLevels;
        this.objects = [];
        this.nodes = [];
    }

    public insert(item: GameObject) {
        if (this.nodes.length > 0) {
            let quadrant: number = this.getIndex(item);

            if (quadrant != -1) {
                this.nodes[quadrant].insert(item);

                return;
            }
        }

        // if it doesn't fit it has to go here
        this.objects.push(item);

        if (this.objects.length > this.maxObjects && this.level < this.maxLevels) {
            if (this.nodes.length == 0) {
                this.split();
            }

            for (let i: number = 0; i < this.objects.length; i++) {
                let quadrant: number = this.getIndex(this.objects[i]);

                if (quadrant != -1) {
                    this.nodes[quadrant].insert(this.objects[i]);
                    this.objects.splice(i, 1);

                    i--;
                }
            }
        }
    }

    public clear() {
        this.objects.length = 0;

        for (let i: number = 0; i < this.nodes.length; i++) {
            this.nodes[i].clear();
        }

        this.nodes.length = 0;
    }

    public get(item: GameObject): GameObject[] {
        let items: GameObject[] = [];
        let quadrant: number = this.getIndex(item);

        if (quadrant != -1 && this.nodes.length > 0) {
            items.push.apply(items, this.nodes[quadrant].get(item));
        }

        items.push.apply(items, this.objects);

        return items;
    }

    private split() {
        let splitWidth: number = this.bounds.width / 2;
        let x: number = this.bounds.x;
        let y: number = this.bounds.y;

        let level: number = this.level + 1;
        // create new bounds object
        let bounds: Bounds = new Bounds(x, y, splitWidth);

        // top left
        this.nodes[0] = new Node(bounds, level, this.maxObjects, this.maxLevels);

        // top right
        bounds.x = x + splitWidth;
        bounds.y = y;
        this.nodes[1] = new Node(bounds, level, this.maxObjects, this.maxLevels);

        // bottom left
        bounds.x = x;
        bounds.y = y + splitWidth;
        this.nodes[2] = new Node(bounds, level, this.maxObjects, this.maxLevels);

        // bottom right
        bounds.x = x + splitWidth;
        bounds.y = y + splitWidth;
        this.nodes[3] = new Node(bounds, level, this.maxObjects, this.maxLevels);
    }

    // find which node the item falls into
    private getIndex(item: GameObject): number {
        let vertMid: number = this.bounds.x + this.bounds.width / 2;
        let horMid: number = this.bounds.y + this.bounds.width / 2;

        // make sure the item actually fits
        // item.x is the center for everything (easier to draw circles?), keep this in mind
        // when drawing rectangles
        let itemLeft: number = item.getX() - item.getWidth() / 2;
        let itemRight: number = item.getX() + item.getWidth() / 2;
        let itemTop: number = item.getY() - item.getWidth() / 2;
        let itemBottom: number = item.getY() + item.getWidth() / 2;

        let index: number = -1;

        // top
        if (itemTop >= this.bounds.y && itemBottom <= horMid) {
            // left
            if (itemLeft >= this.bounds.x && itemRight <= vertMid) {
                index = 0;
            }
            // right
            else if (itemLeft >= vertMid && itemRight <= this.bounds.x + this.bounds.width) {
                index = 1;
            }
        }
        // bottom
        else if (itemTop >= horMid && itemBottom <= this.bounds.y + this.bounds.width) {
            // left
            if (itemLeft >= this.bounds.x && itemRight <= vertMid) {
                index = 2;
            }
            // right
            else if (itemLeft >= vertMid && itemRight <= this.bounds.x + this.bounds.width) {
                index = 3;
            }
        }

        return index;
    }
}

export { QuadTree, Bounds };