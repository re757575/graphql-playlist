const mysql = require('mysql2');
const graphql = require('graphql');
// const _ = require('lodash');

// create the connection to database
const connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '123456',
  database: 'graphql',
});

const {
    GraphQLObjectType,
    GraphQLString,
    GraphQLSchema,
    GraphQLID,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull
} = graphql;

// dummy data
// var books = [
//     { name: 'Name of the Wind', genre: 'Fantasy', id: '1', authorId: '1' },
//     { name: 'The Final Empire', genre: 'Fantasy', id: '2', authorId: '2' },
//     { name: 'The Hero of Ages', genre: 'Fantasy', id: '4', authorId: '2' },
//     { name: 'The Long Earth', genre: 'Sci-Fi', id: '3', authorId: '3' },
//     { name: 'The Colour of Magic', genre: 'Fantasy', id: '5', authorId: '3' },
//     { name: 'The Light Fantastic', genre: 'Fantasy', id: '6', authorId: '3' },
// ];

// var authors = [
//     { name: 'Patrick Rothfuss', age: 44, id: '1' },
//     { name: 'Brandon Sanderson', age: 42, id: '2' },
//     { name: 'Terry Pratchett', age: 66, id: '3' }
// ];

class Model {
    constructor(table) {
        this.table = table;
    }

    findOne(where) {
        return new Promise((resolve, reject) => {
            connection.query(
                `SELECT * FROM ${this.table} WHERE ?`,
                [where],
                function(err, results, fields) {
                    if (err) {
                        reject(err);
                    }
                    if (results && results[0]) {
                        resolve(results[0]);
                    } else {
                        resolve();
                    }
                }
            );
        });
    }

    findAll() {
        return new Promise((resolve, reject) => {
            connection.query(
                `SELECT * FROM ${this.table}`,
                function(err, results, fields) {
                    if (err) {
                        reject(err);
                    }
                    resolve(results);
                }
            );
        });
    }

    add(setFields) {
        return new Promise((resolve, reject) => {
            connection.query(
                `INSERT INTO ${this.table} SET ?`,
                setFields,
                function(err, results, fields) {
                    if (err) {
                        reject(err);
                    }
                    resolve(results);
                }
            );
        });
    }

    updateById(updateFields, id) {
        return new Promise((resolve, reject) => {
            connection.query(
                `UPDATE ${this.table} SET ? WHERE id = ?`,
                [updateFields, id],
                function(err, results, fields) {
                    if (err) {
                        reject(err);
                    }
                    resolve(results);
                }
            );
        });
    }

    deleteById(id) {
        return new Promise((resolve, reject) => {
            connection.query(
                `DELETE FROM ${this.table} WHERE id = ?`,
                [id],
                function(err, results, fields) {
                    if (err) {
                        reject(err);
                    }
                    resolve(results);
                }
            );
        });
    }
}

class BookModel extends Model {
    constructor() {
        super('book');
    }

    getByAuthorId(authorId) {
        return new Promise((resolve, reject) => {
            connection.query(
                `SELECT * FROM ${this.table} WHERE authorId = ${authorId}`,
                function(err, results, fields) {
                    if (err) {
                        reject(err);
                    }
                    resolve(results);
                }
            );
        });
    }
}

class AuthorModel extends Model {
    constructor() {
        super('author');
    }
}

const bookModel = new BookModel();
const authorModel = new AuthorModel();

const BookType = new GraphQLObjectType({
    name: 'Book',
    fields: ( ) => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        authorId: { type: GraphQLID },
        author: {
            type: AuthorType,
            async resolve(parent, args){
                // return _.find(authors, { id: parent.authorId });
                return await authorModel.findOne(parent.authorId);
            }
        }
    })
});

const AuthorType = new GraphQLObjectType({
    name: 'Author',
    fields: ( ) => ({
        id: { type: GraphQLID },
        name: { type: GraphQLString },
        age: { type: GraphQLInt },
        books: {
            type: new GraphQLList(BookType),
            async resolve(parent, args){
                // return _.filter(books, { authorId: parent.id });
                return await bookModel.getByAuthorId(parent.id);
            }
        }
    })
});

const RootQuery = new GraphQLObjectType({
    name: 'RootQueryType',
    fields: {
        book: {
            type: BookType,
            args: { id: { type: GraphQLID } },
            async resolve(parent, args) {
                const { id } = args;
                return await bookModel.findOne({ id });
                // return _.find(books, { id: args.id });
            }
        },
        author: {
            type: AuthorType,
            args: { id: { type: GraphQLID } },
            async resolve(parent, args) {
                const { id } = args;
                return await authorModel.findOne({ id });
                // return _.find(authors, { id: args.id });
            }
        },
        books: {
            type: new GraphQLList(BookType),
            async resolve(parent, args) {
                return await bookModel.findAll();
                // return books;
            }
        },
        authors: {
            type: new GraphQLList(AuthorType),
            async resolve(parent, args) {
                return await authorModel.findAll();
                // return authors;
            }
        }
    }
});

// create update delete
const Mutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        addBook: {
            type: BookType,
            args: {
                name: { type: new GraphQLNonNull(GraphQLString) },
                authorId: { type: new GraphQLNonNull(GraphQLInt) }
            },
            async resolve(parent, args) {
                const book = { name: args.name, authorId: args.authorId };
                const { insertId } = await bookModel.add(book);
                return await bookModel.findOne({ id: insertId });
            }
        },

        updateBook: {
            type: BookType,
            args: {
                id: { type: GraphQLID },
                name: { type: GraphQLString },
                authorId: { type: GraphQLInt }
            },
            async resolve(parent, args) {
                const book = {};
                const { id, name, authorId } = args;
                if (name) {
                    book.name = name;
                }
                if (authorId) {
                    book.authorId = authorId;
                }
                await bookModel.updateById(book, id);

                return await bookModel.findOne({ id });
            }
        },

        deleteBook: {
            type: BookType,
            args: {
                id: { type: GraphQLID },
            },
            async resolve(parent, args) {
                await bookModel.deleteById(args.id);
                return {
                    id: args.id
                };
            }
        },

        addAuthor: {
            type: AuthorType,
            args: {
                age: { type: new GraphQLNonNull(GraphQLInt) },
                name: { type: new GraphQLNonNull(GraphQLString) },
            },
            async resolve(parent, args) {
                const author = { name: args.name, age: args.age };
                const { insertId } = await authorModel.add(author);

                return await authorModel.findOne({ id: insertId });
            }
        },

        updateAuthor: {
            type: AuthorType,
            args: {
                id: { type: GraphQLID },
                age: { type: GraphQLInt },
                name: { type: GraphQLString },
            },
            async resolve(parent, args) {
                const author = {};
                const { id, name, age } = args;
                if (name) {
                    author.name = name;
                }
                if (age) {
                    author.age = age;
                }
                await authorModel.updateById(author, id);

                return await authorModel.findOne({ id });
            }
        },

        deleteAuthor: {
            type: AuthorType,
            args: {
                id: { type: GraphQLID },
            },
            async resolve(parent, args) {
                await authorModel.deleteById(args.id);
                return {
                    id: args.id
                };
            }
        },
    }
});

module.exports = new GraphQLSchema({
    query: RootQuery,
    mutation: Mutation,
});
